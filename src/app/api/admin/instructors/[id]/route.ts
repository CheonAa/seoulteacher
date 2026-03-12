import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const instructor = await prisma.user.findUnique({
            where: { id },
            include: {
                instructorProfile: true,
            }
        });

        if (!instructor) {
            return NextResponse.json({ error: '강사를 찾을 수 없습니다.' }, { status: 404 });
        }

        return NextResponse.json(instructor);
    } catch (error) {
        console.error('Get Instructor Error:', error);
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

        const role = session.user.role;
        if (role !== 'ADMIN' && role !== 'OWNER' && role !== 'INSTRUCTOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, email, password, baseRate, insuranceFee, bankAccountVND, bankAccountKRW, color } = body;

        const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });

        const targetUser = await prisma.user.findUnique({
            where: { id },
            select: { id: true, creatorId: true }
        });

        if (!targetUser) {
            return NextResponse.json({ error: '강사를 찾을 수 없습니다.' }, { status: 404 });
        }

        // Authorization Rule: OWNER can edit anyone. INSTRUCTOR can edit themselves. ADMIN/INSTRUCTOR can edit users they created.
        if (role !== 'OWNER' && targetUser.id !== currentUser?.id && targetUser.creatorId !== currentUser?.id) {
            return NextResponse.json({ error: '본인이 등록한 강사 또는 본인 계정만 수정할 수 있습니다.' }, { status: 403 });
        }

        if (!name || !email || !baseRate) {
            return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
        }

        // 이메일 중복 확인 (본인 제외)
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail && existingEmail.id !== id) {
            return NextResponse.json({ error: '이미 사용중인 이메일입니다.' }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            const userData: any = {
                name,
                email,
            };

            if (color) {
                userData.color = color;
            }

            if (password && password.trim() !== '') {
                userData.password = await bcrypt.hash(password, 10);
            }

            await tx.user.update({
                where: { id },
                data: userData
            });

            // Update or create profile
            await tx.instructorProfile.upsert({
                where: { userId: id },
                update: {
                    baseRate: Number(baseRate) / 100,
                    insuranceFee: Number(insuranceFee) || 0,
                    bankAccountVND: bankAccountVND || null,
                    bankAccountKRW: bankAccountKRW || null,
                },
                create: {
                    userId: id,
                    baseRate: Number(baseRate) / 100,
                    insuranceFee: Number(insuranceFee) || 0,
                    bankAccountVND: bankAccountVND || null,
                    bankAccountKRW: bankAccountKRW || null,
                }
            });

            // Trigger Shuffle Schedule Color Sync
            if (color) {
                await tx.shuttleSchedule.updateMany({
                    where: { instructorId: id },
                    data: { color: color }
                });
            }
        });

        return NextResponse.json({ message: '강사 정보 수정 완료' });
    } catch (error) {
        console.error('Update Instructor Error:', error);
        return NextResponse.json({ error: '강사 수정 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        const targetUser = await prisma.user.findUnique({
            where: { id },
            select: { id: true, creatorId: true }
        });

        if (!targetUser) {
            return NextResponse.json({ error: '강사를 찾을 수 없습니다.' }, { status: 404 });
        }

        // Authorization Rule: OWNER can delete anyone. ADMIN/INSTRUCTOR can delete users they created.
        if (role !== 'OWNER' && targetUser.creatorId !== currentUser?.id) {
            return NextResponse.json({ error: '본인이 등록한 강사만 삭제할 수 있습니다.' }, { status: 403 });
        }

        // 수강생이 등록되어 있는지 확인 (소프트/하드 삭제 정책에 따라 다를 수 있음)
        const enrollmentsCount = await prisma.enrollment.count({
            where: { instructorId: id }
        });

        if (enrollmentsCount > 0) {
            return NextResponse.json({
                error: `현재 이 강사에게 등록된 수강 내역이 ${enrollmentsCount}건 있습니다. 담당 강사를 먼저 변경하거나 삭제해주세요.`
            }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id }
        });

        return NextResponse.json({ message: '강사가 삭제되었습니다.' });
    } catch (error) {
        console.error('Delete Instructor Error:', error);
        return NextResponse.json({ error: '강사 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
