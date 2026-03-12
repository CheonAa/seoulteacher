import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, email, password, baseRate, insuranceFee, bankAccountVND, bankAccountKRW, color } = body;

        if (!name || !email || !password || !baseRate) {
            return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: '이미 존재하는 이메일입니다.' }, { status: 400 });
        }

        let creatorId = null;
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });
        if (currentUser) {
            creatorId = currentUser.id;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 강사 계정 및 프로필 생성 (트랜잭션)
        const instructor = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: 'INSTRUCTOR',
                    creatorId,
                    color: color || '#e2e8f0', // Default color if not provided
                }
            });

            await tx.instructorProfile.create({
                data: {
                    userId: newUser.id,
                    baseRate: Number(baseRate) / 100, // 백분율 -> 소수점 저장 (e.g. 65 -> 0.65)
                    insuranceFee: Number(insuranceFee) || 0,
                    bankAccountVND: bankAccountVND || null,
                    bankAccountKRW: bankAccountKRW || null,
                }
            });

            return newUser;
        });

        return NextResponse.json({ message: '강사 등록 완료', instructor });
    } catch (error) {
        console.error('Create Instructor Error:', error);
        return NextResponse.json({ error: '강사 등록 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
