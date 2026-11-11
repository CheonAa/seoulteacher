import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (role !== 'OWNER' && role !== 'ADMIN') {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const {
            depositDate,
            amount,
            description,
            matchedStudentName,
            studentId,
            instructorId,
            reconciliationStatus
        } = body;

        let resolvedStudentName = matchedStudentName !== undefined ? (matchedStudentName?.trim() || null) : undefined;
        if (!resolvedStudentName && studentId) {
            const st = await prisma.student.findUnique({
                where: { id: studentId },
                select: { name: true }
            });
            if (st) resolvedStudentName = st.name;
        }

        const updated = await prisma.depositRecord.update({
            where: { id },
            data: {
                ...(depositDate ? { depositDate: new Date(depositDate) } : {}),
                ...(amount !== undefined ? { amount: Number(amount) } : {}),
                ...(description !== undefined ? { description: description.trim() } : {}),
                ...(resolvedStudentName !== undefined ? { matchedStudentName: resolvedStudentName } : {}),
                ...(studentId !== undefined ? { studentId: studentId || null } : {}),
                ...(instructorId !== undefined ? { instructorId: instructorId || null } : {}),
                ...(reconciliationStatus !== undefined ? { reconciliationStatus } : {})
            },
            include: {
                instructor: { select: { id: true, name: true } },
                student: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json({ deposit: updated });
    } catch (error) {
        console.error('PATCH Deposit Error:', error);
        return NextResponse.json({ error: '입금 내역 수정에 실패했습니다.' }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (role !== 'OWNER' && role !== 'ADMIN') {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        const { id } = await params;
        await prisma.depositRecord.delete({ where: { id } });

        return NextResponse.json({ message: '입금 내역이 삭제되었습니다.' });
    } catch (error) {
        console.error('DELETE Deposit Error:', error);
        return NextResponse.json({ error: '입금 내역 삭제에 실패했습니다.' }, { status: 500 });
    }
}
