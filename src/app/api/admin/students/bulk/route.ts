import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (role !== 'ADMIN' && role !== 'OWNER') {
            return NextResponse.json({ error: '관리자 또는 원장님만 일괄 등록을 사용할 수 있습니다.' }, { status: 403 });
        }

        const body = await req.json();
        const { students } = body;

        let creatorId = null;
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });
        if (currentUser) {
            creatorId = currentUser.id;
        }

        if (!students || !Array.isArray(students) || students.length === 0) {
            return NextResponse.json({ error: '등록할 학생 데이터가 없습니다.' }, { status: 400 });
        }

        // Run as a transaction, creating one student at a time.
        await prisma.$transaction(async (tx) => {
            for (const s of students) {
                if (!s.name || !s.enrollments || s.enrollments.length === 0) {
                    throw new Error(`학생명 및 수강 정보는 필수입니다. (${s.name || '이름 없음'})`);
                }

                await tx.student.create({
                    data: {
                        name: s.name,
                        gender: s.gender || null,
                        school: s.school || null,
                        grade: s.grade || null,
                        phone: s.phone || null,
                        qrToken: uuidv4(),
                        shuttleStatus: "NOT_BOARDING",
                        creatorId,
                        enrollments: {
                            create: s.enrollments.map((enr: any) => ({
                                instructorId: enr.instructorId,
                                subjectName: enr.subjectName,
                                feePerSession: Number(enr.feePerSession),
                                targetSessionsMonth: Number(enr.targetSessionsMonth),
                                depositorName: enr.depositorName || null,
                                startDate: new Date(),
                                status: "ACTIVE"
                            }))
                        }
                    }
                });
            }
        });

        return NextResponse.json({ message: '학생 일괄 등록 완료' });
    } catch (error: any) {
        console.error('Bulk Students Error:', error);
        return NextResponse.json({ error: error.message || '학생 일괄 등록 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
