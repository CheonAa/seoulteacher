import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (role !== 'ADMIN' && role !== 'OWNER' && role !== 'INSTRUCTOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        // Frontend should pass the ID of the vacation special that is currently ACTIVE and needs to be CLOSED.
        const {
            vacationEnrollmentId,
            resumeDate
        } = body;

        if (!vacationEnrollmentId || !resumeDate) {
            return NextResponse.json({ error: '종료할 특강 ID와 재개 일자를 선택해주세요.' }, { status: 400 });
        }

        // Fetch the paused original enrollment
        const pausedEnrollment = await prisma.enrollment.findUnique({
            where: { id },
            include: {
                student: true
            }
        }) as any;

        if (!pausedEnrollment || pausedEnrollment.status !== "PAUSED") {
            return NextResponse.json({ error: '재개할 수강 정보가 유효하지 않거나 일시 중단 상태가 아닙니다.' }, { status: 404 });
        }

        // Fetch the active vacation enrollment
        const vacationEnrollment = await prisma.enrollment.findUnique({
            where: { id: vacationEnrollmentId }
        }) as any;

        if (!vacationEnrollment || vacationEnrollment.status !== "ACTIVE") {
            return NextResponse.json({ error: '종료할 진행 중인 특강을 찾을 수 없습니다.' }, { status: 404 });
        }
        
        // Authorization check
        const currentUser = await prisma.user.findUnique({
             where: { email: session.user.email },
             select: { id: true }
        });
        
        if (role === 'INSTRUCTOR' && pausedEnrollment.instructorId !== currentUser?.id) {
            return NextResponse.json({ error: '본인이 담당하는 수강만 재개할 수 있습니다.' }, { status: 403 });
        }

        // Calculate remaining sessions from the VACATION class
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        const latestVacationBilling = await prisma.monthlyBilling.findFirst({
            where: { 
                enrollmentId: vacationEnrollmentId,
                year: currentYear,
                month: currentMonth
            },
            orderBy: { createdAt: 'desc' }
        });

        let sessionsToCarryOverBack = 0;
        if (latestVacationBilling) {
            // formula: (Target + CarryOverFromPrevious) - Attended
            sessionsToCarryOverBack = (latestVacationBilling.targetSessions + latestVacationBilling.carryOverSessions) - latestVacationBilling.attendedSessions;
            if (sessionsToCarryOverBack < 0) sessionsToCarryOverBack = 0; 
        }

        // Use transaction to resume original and close vacation
        const result = await prisma.$transaction(async (tx) => {
            // 1. Close vacation enrollment
            await tx.enrollment.update({
                where: { id: vacationEnrollmentId },
                data: {
                    status: "CLOSED",
                    endDate: new Date()
                }
            });

            // 2. Resume original enrollment
            const resumedEnrollment = await tx.enrollment.update({
                where: { id },
                data: {
                    status: "ACTIVE",
                    pausedReason: null,
                    startDate: new Date(resumeDate) // Resetting start date to the resumed point
                } as any
            });

            // 3. Create a fresh billing record for the resumed enrollment
            await tx.monthlyBilling.create({
                data: {
                    enrollmentId: resumedEnrollment.id,
                    year: currentYear,
                    month: currentMonth,
                    targetSessions: resumedEnrollment.targetSessionsMonth,
                    attendedSessions: 0,
                    carryOverSessions: sessionsToCarryOverBack,
                    isPaid: false
                }
            });

            return resumedEnrollment;
        });

        return NextResponse.json({ 
            message: '수업이 성공적으로 재개되었습니다.', 
            resumedEnrollment: result,
            carriedOverBack: sessionsToCarryOverBack
        });

    } catch (error) {
         console.error('Enrollment Resume Error:', error);
         return NextResponse.json({ error: '수업 재개 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
