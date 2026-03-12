import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "INSTRUCTOR")) {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

        // Get all instructor profiles
        let profilesQuery: any = { include: { user: true } };
        
        // If instructor, only fetch their own profile
        if (session.user.role === "INSTRUCTOR") {
            profilesQuery.where = { userId: session.user.id };
        }
        
        const profiles = await prisma.instructorProfile.findMany(profilesQuery);

        // Fetch attendances for the given month to calculate tuition
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const attendances = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                // Include PRESENT and EXCUSED (공결/병결) as billable sessions
                status: {
                    in: ["PRESENT", "EXCUSED"]
                }
            },
            include: {
                enrollment: true
            }
        });

        // Group attendances by instructor and calculate Total Tuition VND
        const calculatedPayrolls = profiles.map(profile => {
            // Find all billable attendances for this instructor
            const instructorAttendances = attendances.filter(
                a => a.enrollment.instructorId === profile.userId
            );

            // Calculate total tuition VND: sum of feePerSession for each valid attendance
            const totalTuitionVND = instructorAttendances.reduce(
                (sum, a) => sum + (a.enrollment.feePerSession || 0), 0
            );

            // Calculate owner's cut vs instructor's cut (baseRate)
            // Note: The totalTuitionVND for the instructor is Total Tuition * BaseRate
            const instructorShareVND = Math.floor(totalTuitionVND * profile.baseRate);

            return {
                instructorProfileId: profile.id,
                userId: profile.userId,
                name: profile.user.name,
                baseRate: profile.baseRate,
                insuranceFee: profile.insuranceFee,
                totalTuitionVND: instructorShareVND, // This is the Gross Total VND for this instructor
                
                // Defaults for the UI inputs if not saved yet
                netVietnamSalary: 0, 
                exchangeRate: 0,
                transferFee: 23000,
            };
        });

        // Fetch any saved payrolls for this year/month
        const savedPayrolls = await prisma.payroll.findMany({
            where: { year, month }
        });

        // Merge saved data with calculated data
        const mergedData = calculatedPayrolls.map(calc => {
            const saved = savedPayrolls.find(p => p.instructorProfileId === calc.instructorProfileId);
            if (saved) {
                // Return exactly what was saved in the DB
                return {
                    ...calc,
                    ...saved,
                    isSaved: true
                };
            }
            return {
                ...calc,
                isSaved: false
            };
        });

        return NextResponse.json({ payrolls: mergedData }, { status: 200 });

    } catch (error) {
        console.error("GET Payroll Error:", error);
        return NextResponse.json({ error: "급여 내역을 불러오는데 실패했습니다." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "OWNER") {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const body = await req.json();
        const { year, month, payrolls } = body;

        if (!year || !month || !Array.isArray(payrolls)) {
            return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            // Clear existing for this month
            await tx.payroll.deleteMany({
                where: { year, month }
            });

            // Insert new ones
            for (const p of payrolls) {
                // Formula calculations to ensure integrity
                const grossVietnamSalary = Math.floor(p.netVietnamSalary / (1 - 0.035));
                const tax35Deduction = grossVietnamSalary - p.netVietnamSalary;
                
                const remainingVND = p.totalTuitionVND - p.insuranceDeduction - grossVietnamSalary;
                
                // If exchange rate is 0 to avoid division by zero
                const exchangeRate = p.exchangeRate || 1; 
                const exchangedKRW = Math.floor(remainingVND / exchangeRate);
                
                const preTaxKRW = exchangedKRW - p.transferFee;
                const tax33Deduction = Math.round(preTaxKRW * 0.033);
                const netPaidKRW = preTaxKRW - tax33Deduction;

                await tx.payroll.create({
                    data: {
                        instructorProfileId: p.instructorProfileId,
                        year,
                        month,
                        
                        totalTuitionVND: p.totalTuitionVND,
                        insuranceDeduction: p.insuranceDeduction,
                        netVietnamSalary: p.netVietnamSalary,
                        grossVietnamSalary: grossVietnamSalary,
                        tax35Deduction,
                        remainingVND,
                        
                        exchangeRate: p.exchangeRate,
                        transferFee: p.transferFee,
                        exchangedKRW,
                        preTaxKRW,
                        tax33Deduction,
                        netPaidKRW
                    }
                });
            }
        });

        return NextResponse.json({ message: "급여 정산이 저장되었습니다." }, { status: 200 });
    } catch (error) {
        console.error("POST Payroll Error:", error);
        return NextResponse.json({ error: "급여 정산 저장에 실패했습니다." }, { status: 500 });
    }
}
