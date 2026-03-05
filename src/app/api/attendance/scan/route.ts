import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { qrToken } = await req.json();
        if (!qrToken) return NextResponse.json({ error: 'QR Token is required' }, { status: 400 });

        const student = await prisma.student.findUnique({
            where: { qrToken },
            include: {
                enrollments: true,
            }
        });

        if (!student) return NextResponse.json({ error: '유효하지 않은 QR 코드입니다.' }, { status: 404 });
        if (student.enrollments.length === 0) return NextResponse.json({ error: '수강 중인 과목이 없습니다.' }, { status: 400 });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 여기서는 첫 번째 수강과목에 대해서만 출석 처리 (추후 복수 수강 선택 로직 추가 가능)
        const enrollment = student.enrollments[0];

        // 오늘 이미 출석했는지 확인
        const existing = await prisma.attendance.findFirst({
            where: {
                enrollmentId: enrollment.id,
                date: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        if (existing) {
            return NextResponse.json({ message: '오늘은 이미 출석 처리되었습니다.', student }, { status: 200 });
        }

        // 출석 생성
        await prisma.attendance.create({
            data: {
                enrollmentId: enrollment.id,
                method: 'QR_SCAN',
                status: 'PRESENT',
            }
        });

        // 이번 달 청구/이월 세션 업데이트
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;

        let billing = await prisma.monthlyBilling.findFirst({
            where: {
                enrollmentId: enrollment.id,
                year: currentYear,
                month: currentMonth
            }
        });

        if (!billing) {
            // 전달의 이월 회차를 가져오는 로직 (엑셀 기준) - 현재는 단순 생성
            billing = await prisma.monthlyBilling.create({
                data: {
                    enrollmentId: enrollment.id,
                    year: currentYear,
                    month: currentMonth,
                    targetSessions: enrollment.targetSessionsMonth,
                    attendedSessions: 1,
                    carryOverSessions: enrollment.targetSessionsMonth - 1,
                }
            });
        } else {
            const newAttended = billing.attendedSessions + 1;
            const newCarryOver = billing.targetSessions - newAttended;
            billing = await prisma.monthlyBilling.update({
                where: { id: billing.id },
                data: {
                    attendedSessions: newAttended,
                    carryOverSessions: newCarryOver,
                }
            });
        }

        const isLastSession = billing.attendedSessions >= billing.targetSessions;

        return NextResponse.json({
            message: `${student.name} 학생 출석이 완료되었습니다! (이번 달 ${billing.attendedSessions}회 / 목표 ${billing.targetSessions}회)${isLastSession ? ' - 목표 횟수에 도달했습니다!' : ''}`,
            student,
            billing
        });
    } catch (error) {
        console.error('QR Scan Error:', error);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}
