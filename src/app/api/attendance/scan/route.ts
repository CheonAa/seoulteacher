import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncBillings } from '@/lib/billingSync';

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

        const billing = await prisma.$transaction(async (tx) => {
            // 출석 생성
            await tx.attendance.create({
                data: {
                    enrollmentId: enrollment.id,
                    method: 'QR_SCAN',
                    status: 'PRESENT',
                }
            });

            // 이번 달 청구/이월 세션 업데이트
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth() + 1;

            let b = await tx.monthlyBilling.findFirst({
                where: {
                    enrollmentId: enrollment.id,
                    year: currentYear,
                    month: currentMonth
                }
            });

            if (!b) {
                b = await tx.monthlyBilling.create({
                    data: {
                        enrollmentId: enrollment.id,
                        year: currentYear,
                        month: currentMonth,
                        targetSessions: 0,
                        attendedSessions: 1,
                        carryOverSessions: 0,
                    }
                });
            } else {
                b = await tx.monthlyBilling.update({
                    where: { id: b.id },
                    data: {
                        attendedSessions: b.attendedSessions + 1,
                    }
                });
            }

            await syncBillings(tx, enrollment.id, currentYear, currentMonth);
            
            // Re-fetch b after sync to get updated carryOver and target sessions
            return await tx.monthlyBilling.findUniqueOrThrow({ where: { id: b.id }});
        });

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
