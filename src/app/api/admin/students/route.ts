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
        if (role !== 'ADMIN' && role !== 'OWNER' && role !== 'INSTRUCTOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, englishName, gender, school, grade, phone, parents, shuttleStatus, shuttleLocation, enrollments = [] } = body;

        let creatorId = null;
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });
        if (currentUser) {
            creatorId = currentUser.id;
        }

        // 강사가 등록할 때는 무조건 본인 ID로 강제 고정
        if (role === 'INSTRUCTOR') {
            enrollments.forEach((enr: any) => {
                enr.instructorId = creatorId;
            });
        }

        if (!name || enrollments.length === 0) {
            return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
        }

        // 학생 및 수강 정보 트랜잭션으로 생성 (parents 배열 포함)
        const student = await prisma.$transaction(async (tx) => {
            const newStudent = await tx.student.create({
                data: {
                    name,
                    englishName: englishName || null,
                    gender: gender || null,
                    school: school || null,
                    grade: grade ? String(grade) : null,
                    phone: phone || null,
                    qrToken: uuidv4(),
                    shuttleStatus: shuttleStatus || "NOT_BOARDING",
                    shuttleLocation: shuttleLocation || null,
                    creatorId,
                    parents: {
                        create: parents && Array.isArray(parents) ? parents.map((p: any) => ({
                            name: p.name,
                            englishName: p.englishName || null,
                            phone: p.phone,
                            relation: p.relation || null
                        })) : []
                    },
                    enrollments: {
                        create: enrollments.map((enr: any) => ({
                            instructorId: enr.instructorId,
                            subjectName: enr.subjectName,
                            curriculum: enr.curriculum || "KOREAN",
                            period: enr.period || "SEMESTER",
                            gradeGroup: enr.gradeGroup || "ELEM",
                            feePerSession: Number(enr.feePerSession),
                            targetSessionsMonth: Number(enr.targetSessionsMonth),
                            depositorName: enr.depositorName || null,
                            accountNumber: enr.accountNumber || null,
                            startDate: enr.startDate ? new Date(enr.startDate) : new Date(),
                            status: enr.status || "ACTIVE",
                            pausedReason: enr.pausedReason || null
                        }))
                    }
                } as any, // Bypass strict TS check for new schema fields not yet generated
                include: {
                    enrollments: true,
                    parents: true
                }
            });
            return newStudent;
        });

        return NextResponse.json({ message: '학생 등록 완료', student });
    } catch (error) {
        console.error('Create Student Error:', error);
        return NextResponse.json({ error: '학생 등록 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
