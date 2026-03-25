import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This is a batch endpoint meant to be hit by a cron job or an admin button click to bulk calculate payrolls for a month.
// Useful for auto-generating payroll records at the end of the month without manually saving in the UI.

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        // Simple protection against public hitting. Use VERCEL CRON Secret normally.
        if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        // Typically run on the 1st of the month to calculate for the *previous* month
        let month = now.getMonth(); 
        let year = now.getFullYear();
        if (month === 0) {
            month = 12;
            year -= 1;
        }

        const profiles = await prisma.instructorProfile.findMany({
            include: { user: true }
        });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const attendances = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: {
                    in: ["PRESENT", "EXCUSED"]
                }
            },
            include: {
                enrollment: true
            }
        });

        const existing = await prisma.payroll.findMany({
            where: { year, month }
        });

        await prisma.$transaction(async (tx) => {
            for (const profile of profiles) {
                 if (existing.some(e => e.instructorProfileId === profile.id)) continue;

                 const instructorAttendances = attendances.filter(
                     a => a.enrollment.instructorId === profile.userId
                 );
                 const totalTuitionVND = instructorAttendances.reduce(
                     (sum, a) => sum + (a.enrollment.feePerSession || 0), 0
                 );
                 const instructorShareVND = Math.floor(totalTuitionVND * profile.baseRate);
                 
                 const insuranceDeduction = profile.insuranceFee || 0;
                 // Batch auto calculation assumes no custom target net salary
                 const netVietnamSalary = 0; 
                 const grossVietnamSalary = 0;
                 const tax35Deduction = 0;
                 const remainingVND = instructorShareVND - insuranceDeduction;

                 const exchangeRate = 18.5; 
                 const transferFee = 23000;
                 const exchangedKRW = Math.floor(remainingVND / exchangeRate);
                 const preTaxKRW = exchangedKRW > transferFee ? exchangedKRW - transferFee : 0;
                 const tax33Deduction = preTaxKRW > 0 ? Math.round(preTaxKRW * 0.033) : 0;
                 const netPaidKRW = preTaxKRW - tax33Deduction;

                 await tx.payroll.create({
                     data: {
                         instructorProfileId: profile.id,
                         year,
                         month,
                         totalTuitionVND: instructorShareVND,
                         insuranceDeduction,
                         netVietnamSalary,
                         grossVietnamSalary,
                         tax35Deduction,
                         remainingVND,
                         exchangeRate,
                         transferFee,
                         exchangedKRW,
                         preTaxKRW,
                         tax33Deduction,
                         netPaidKRW
                     }
                 });
            }
        });

        return NextResponse.json({ message: "월간 일괄 급여 정산이 완료되었습니다." }, { status: 200 });
    } catch (e: any) {
        console.error("Batch Payroll Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
