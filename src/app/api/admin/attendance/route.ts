import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { syncBillings } from '@/lib/billingSync';

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
        // Expecting { date: "ISO string", records: [{ enrollmentId, status }] }
        const { date, records } = body;

        // Fallback for older singular payload (just in case)
        if (body.enrollmentId && body.status && !records) {
            // Existing logic
        }

        if (!date || !records || !Array.isArray(records) || records.length === 0) {
            return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        const attendanceDate = new Date(date);
        const targetYear = attendanceDate.getFullYear();
        const targetMonth = attendanceDate.getMonth() + 1;

        const affectedEnrollmentIds = new Set<string>();

        // Processing records in bulk sequentially (or using transaction)
        await prisma.$transaction(async (tx) => {
            for (const record of records) {
                const enrollment = await tx.enrollment.findUnique({
                    where: { id: record.enrollmentId }
                });

                if (!enrollment) continue;

                // 강사일 경우, 본인의 학생인지 검증
                if (role === 'INSTRUCTOR' && enrollment.instructorId !== currentUser?.id) {
                    throw new Error(`Unauthorized enrollment access: ${record.enrollmentId}`);
                }

                // 출석 기록 생성
                await tx.attendance.create({
                    data: {
                        enrollmentId: record.enrollmentId,
                        date: attendanceDate,
                        status: record.status,
                        method: 'MANUAL',
                        creatorId: currentUser?.id
                    }
                });

                // 출석(PRESENT)인 경우에만 카운트 차감/업데이트
                if (record.status === 'PRESENT') {
                    const billing = await tx.monthlyBilling.findFirst({
                        where: {
                            enrollmentId: enrollment.id,
                            year: targetYear,
                            month: targetMonth
                        }
                    });

                    if (!billing) {
                        await tx.monthlyBilling.create({
                            data: {
                                enrollmentId: enrollment.id,
                                year: targetYear,
                                month: targetMonth,
                                targetSessions: 0,
                                attendedSessions: 1,
                                carryOverSessions: 0,
                            }
                        });
                    } else {
                        await tx.monthlyBilling.update({
                            where: { id: billing.id },
                            data: {
                                attendedSessions: billing.attendedSessions + 1,
                            }
                        });
                    }

                    affectedEnrollmentIds.add(enrollment.id);
                }
            }
        }, {
            maxWait: 5000, // 기본 2000ms 보다 길게 설정
            timeout: 10000, // 기본 5000ms 보다 길게 10초로 설정
        });

        // Sync the billings forward after the main transaction is closed, to avoid timeouts
        for (const enrollmentId of affectedEnrollmentIds) {
            await prisma.$transaction(async (tx) => {
                await syncBillings(tx, enrollmentId, targetYear, targetMonth);
            });
        }

        return NextResponse.json({ message: '일괄 출결 등록 완료' });
    } catch (error: any) {
        console.error('Manual Attendance Error:', error);
        return NextResponse.json({ error: error.message || '출결 등록 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
