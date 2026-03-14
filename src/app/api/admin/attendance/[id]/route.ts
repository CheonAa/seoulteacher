import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { syncBillings } from '@/lib/billingSync';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const attendance = await prisma.attendance.findUnique({
            where: { id },
            include: {
                enrollment: {
                    include: {
                        student: { select: { name: true } },
                        instructor: { select: { name: true } }
                    }
                }
            }
        });

        if (!attendance) {
            return NextResponse.json({ error: '출결 기록을 찾을 수 없습니다.' }, { status: 404 });
        }

        return NextResponse.json(attendance);
    } catch (error) {
        console.error('Get Attendance Error:', error);
        return NextResponse.json({ error: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { enrollmentId, date, status } = body;

        if (!enrollmentId || !date || !status) {
            return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
        }

        // Find existing attendance to compare status
        const existingAttendance = await prisma.attendance.findUnique({
            where: { id },
            include: { enrollment: true }
        });

        if (!existingAttendance) {
            return NextResponse.json({ error: '출결 기록을 찾을 수 없습니다.' }, { status: 404 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        const role = session.user.role;

        // Authorization Rule: OWNER can edit anything. ADMIN/INSTRUCTOR can only edit their own creations.
        if (role !== 'OWNER' && existingAttendance.creatorId !== currentUser?.id) {
            return NextResponse.json({ error: '본인이 등록한 출결 기록만 수정할 수 있습니다.' }, { status: 403 });
        }

        const oldStatus = existingAttendance.status;
        const targetDate = new Date(date);

        await prisma.$transaction(async (tx) => {
            // Update attendance record
            await tx.attendance.update({
                where: { id },
                data: {
                    enrollmentId,
                    date: targetDate,
                    status
                }
            });

            // Logically handle the side effects to Billing if the status changes between PRESENT and others
            if (oldStatus !== status) {
                // Find corresponding billing for the month
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth() + 1;

                const billing = await tx.monthlyBilling.findFirst({
                    where: {
                        enrollmentId: existingAttendance.enrollmentId,
                        year,
                        month
                    }
                });

                if (billing) {
                    let attendedDelta = 0;
                    if (oldStatus === 'PRESENT' && status !== 'PRESENT') {
                        attendedDelta = -1; // Removed a present mark
                    } else if (oldStatus !== 'PRESENT' && status === 'PRESENT') {
                        attendedDelta = 1; // Added a present mark
                    }

                    if (attendedDelta !== 0) {
                        const newAttended = Math.max(0, billing.attendedSessions + attendedDelta);

                        await tx.monthlyBilling.update({
                            where: { id: billing.id },
                            data: {
                                attendedSessions: newAttended,
                            }
                        });

                        await syncBillings(tx, existingAttendance.enrollmentId, year, month);
                    }
                }
            }
        });

        return NextResponse.json({ message: '출결 수정 완료' });
    } catch (error) {
        console.error('Update Attendance Error:', error);
        return NextResponse.json({ error: '출결 수정 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const attendance = await prisma.attendance.findUnique({
            where: { id }
        });

        if (!attendance) {
            return NextResponse.json({ error: '출결 기록을 찾을 수 없습니다.' }, { status: 404 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        const role = session.user.role;

        // Authorization Rule: OWNER can delete anything. ADMIN/INSTRUCTOR can only delete their own creations.
        if (role !== 'OWNER' && attendance.creatorId !== currentUser?.id) {
            return NextResponse.json({ error: '본인이 등록한 출결 기록만 삭제할 수 있습니다.' }, { status: 403 });
        }

        await prisma.$transaction(async (tx) => {
            // Logically handle the side effects to Billing
            if (attendance.status === 'PRESENT') {
                const targetDate = new Date(attendance.date);
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth() + 1;

                const billing = await tx.monthlyBilling.findFirst({
                    where: {
                        enrollmentId: attendance.enrollmentId,
                        year,
                        month
                    }
                });

                if (billing && billing.attendedSessions > 0) {
                    const newAttended = billing.attendedSessions - 1;

                    await tx.monthlyBilling.update({
                        where: { id: billing.id },
                        data: {
                            attendedSessions: newAttended,
                        }
                    });

                    await syncBillings(tx, attendance.enrollmentId, year, month);
                }
            }

            await tx.attendance.delete({
                where: { id }
            });
        });

        return NextResponse.json({ message: '출결 기록이 삭제되었습니다.' });
    } catch (error) {
        console.error('Delete Attendance Error:', error);
        return NextResponse.json({ error: '출결 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
