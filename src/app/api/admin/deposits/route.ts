import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (role !== 'OWNER' && role !== 'ADMIN') {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        const deposits = await prisma.depositRecord.findMany({
            include: {
                instructor: { select: { id: true, name: true } },
                student: { select: { id: true, name: true } }
            },
            orderBy: [
                { depositDate: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json({ deposits });
    } catch (error) {
        console.error('GET Deposits Error:', error);
        return NextResponse.json({ error: '입금 대사 내역을 불러오는데 실패했습니다.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (role !== 'OWNER' && role !== 'ADMIN') {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

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

        if (!depositDate || amount === undefined || amount === null) {
            return NextResponse.json({ error: '입금일자와 입금액은 필수입니다.' }, { status: 400 });
        }

        let resolvedStudentName = matchedStudentName?.trim() || null;
        if (!resolvedStudentName && studentId) {
            const st = await prisma.student.findUnique({
                where: { id: studentId },
                select: { name: true }
            });
            if (st) resolvedStudentName = st.name;
        }

        const created = await prisma.depositRecord.create({
            data: {
                depositDate: new Date(depositDate),
                amount: Number(amount),
                description: description?.trim() || '',
                matchedStudentName: resolvedStudentName,
                studentId: studentId || null,
                instructorId: instructorId || null,
                reconciliationStatus: reconciliationStatus || '입금확인'
            },
            include: {
                instructor: { select: { id: true, name: true } },
                student: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json({ deposit: created }, { status: 201 });
    } catch (error) {
        console.error('POST Deposit Error:', error);
        return NextResponse.json({ error: '입금 내역 등록에 실패했습니다.' }, { status: 500 });
    }
}
