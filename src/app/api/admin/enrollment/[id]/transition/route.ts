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
        // The frontend should send the details for the new (vacation) enrollment
        const {
            subjectName,
            feePerSession,
            targetSessionsMonth,
            depositorName,
            startDate,
            pausedReason = "특강으로 인한 수업 전환 및 일시 중단"
        } = body;

        if (!subjectName || !feePerSession || !targetSessionsMonth || !startDate) {
            return NextResponse.json({ error: '필수 특강 정보가 누락되었습니다.' }, { status: 400 });
        }

        // Fetch the old enrollment to be paused
        const oldEnrollment = await prisma.enrollment.findUnique({
            where: { id },
            include: {
                student: true
            }
        });

        if (!oldEnrollment) {
            return NextResponse.json({ error: '기존 수강 정보를 찾을 수 없습니다.' }, { status: 404 });
        }
        
        // Ensure INSTRUCTOR can only transition their own enrollments
        const currentUser = await prisma.user.findUnique({
             where: { email: session.user.email },
             select: { id: true }
        });
        
        if (role === 'INSTRUCTOR' && oldEnrollment.instructorId !== currentUser?.id) {
            return NextResponse.json({ error: '본인이 담당하는 수강만 전환할 수 있습니다.' }, { status: 403 });
        }

        // Calculate remaining sessions from the CURRENT month's billing
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        const latestBilling = await prisma.monthlyBilling.findFirst({
            where: { 
                enrollmentId: id,
                year: currentYear,
                month: currentMonth
            },
            orderBy: { createdAt: 'desc' }
        });

        let sessionsToCarryOver = 0;
        if (latestBilling) {
            // formula: (Target + CarryOverFromPrevious) - Attended
            sessionsToCarryOver = (latestBilling.targetSessions + latestBilling.carryOverSessions) - latestBilling.attendedSessions;
            // Prevent negative carryover initially unless you specifically want to track over-attendance debt
            if (sessionsToCarryOver < 0) sessionsToCarryOver = 0; 
        } else {
             // Fallback if no billing exists yet: calculate raw attendance vs targets
             const totalAttended = await prisma.attendance.count({
                where: { enrollmentId: id, status: "PRESENT" }
             });
             sessionsToCarryOver = oldEnrollment.targetSessionsMonth - totalAttended;
             if (sessionsToCarryOver < 0) sessionsToCarryOver = 0; 
        }

        // Use transaction to pause old and create new
        const result = await prisma.$transaction(async (tx) => {
            // 1. Pause old enrollment
            await tx.enrollment.update({
                where: { id },
                data: {
                    status: "PAUSED",
                    pausedReason,
                    endDate: new Date() // Mark paused point
                }
            });

            // 2. Create new (vacation) enrollment
            const newEnrollment = await tx.enrollment.create({
                data: {
                    studentId: oldEnrollment.studentId,
                    instructorId: oldEnrollment.instructorId,
                    subjectName,
                    feePerSession: Number(feePerSession),
                    targetSessionsMonth: Number(targetSessionsMonth),
                    depositorName: depositorName || oldEnrollment.depositorName,
                    startDate: new Date(startDate),
                    status: "ACTIVE"
                }
            });

            // 3. Create initial billing record for the new enrollment with the carryOver
            await tx.monthlyBilling.create({
                data: {
                    enrollmentId: newEnrollment.id,
                    year: currentYear,
                    month: currentMonth,
                    targetSessions: Number(targetSessionsMonth),
                    attendedSessions: 0,
                    carryOverSessions: sessionsToCarryOver,
                    isPaid: false
                }
            });

            return newEnrollment;
        });

        return NextResponse.json({ 
            message: '수업이 성공적으로 전환되었습니다.', 
            newEnrollment: result,
            carriedOver: sessionsToCarryOver
        });

    } catch (error) {
         console.error('Enrollment Transition Error:', error);
         return NextResponse.json({ error: '수업 전환 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
