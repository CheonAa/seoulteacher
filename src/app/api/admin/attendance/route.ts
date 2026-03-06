import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (role !== 'ADMIN' && role !== 'OWNER' && role !== 'INSTRUCTOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { enrollmentId, date, status } = body;

        if (!enrollmentId || !date || !status) {
            return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
        }

        const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId }
        });

        if (!enrollment) {
            return NextResponse.json({ error: '유효하지 않은 수강 정보입니다.' }, { status: 404 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        // 강사일 경우, 본인의 학생인지 검증
        if (role === 'INSTRUCTOR') {
            if (enrollment.instructorId !== currentUser?.id) {
                return NextResponse.json({ error: '본인이 담당하는 학생의 출결만 기록할 수 있습니다.' }, { status: 403 });
            }
        }

        const attendanceDate = new Date(date);

        // 날짜 기준 이번 달 청구/이월 레코드 찾기
        const targetYear = attendanceDate.getFullYear();
        const targetMonth = attendanceDate.getMonth() + 1;

        // 출석 기록 생성
        const attendance = await prisma.attendance.create({
            data: {
                enrollmentId,
                date: attendanceDate,
                status,
                method: 'MANUAL',
                creatorId: currentUser?.id
            }
        });

        // 출석(PRESENT)인 경우에만 카운트 차감/업데이트
        if (status === 'PRESENT') {
            let billing = await prisma.monthlyBilling.findFirst({
                where: {
                    enrollmentId: enrollment.id,
                    year: targetYear,
                    month: targetMonth
                }
            });

            if (!billing) {
                await prisma.monthlyBilling.create({
                    data: {
                        enrollmentId: enrollment.id,
                        year: targetYear,
                        month: targetMonth,
                        targetSessions: enrollment.targetSessionsMonth,
                        attendedSessions: 1,
                        carryOverSessions: enrollment.targetSessionsMonth - 1,
                    }
                });
            } else {
                const newAttended = billing.attendedSessions + 1;
                const newCarryOver = billing.targetSessions - newAttended;
                await prisma.monthlyBilling.update({
                    where: { id: billing.id },
                    data: {
                        attendedSessions: newAttended,
                        carryOverSessions: newCarryOver,
                    }
                });
            }
        }

        return NextResponse.json({ message: '수동 출결 등록 완료', attendance });
    } catch (error) {
        console.error('Manual Attendance Error:', error);
        return NextResponse.json({ error: '출결 등록 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
