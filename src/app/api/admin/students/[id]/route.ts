import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const student = await prisma.student.findUnique({
            where: { id },
            include: {
                parents: true,
                enrollments: {
                    include: {
                        instructor: { select: { id: true, name: true, email: true } }
                    }
                }
            }
        });

        if (!student) {
            return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 });
        }

        return NextResponse.json(student);
    } catch (error) {
        console.error('Get Student Error:', error);
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

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        const student = await prisma.student.findUnique({
            where: { id },
            select: { creatorId: true }
        });

        if (!student) {
            return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 });
        }

        // Authorization Rule: OWNER can edit anything. ADMIN/INSTRUCTOR can only edit their own creations.
        if (role !== 'OWNER' && student.creatorId !== currentUser?.id) {
            return NextResponse.json({ error: '본인이 등록한 학생만 수정할 수 있습니다.' }, { status: 403 });
        }

        const body = await req.json();
        const { name, gender, school, grade, phone, subjectName, feePerSession, targetSessionsMonth, parents, depositorName, shuttleStatus, shuttleLocation } = body;
        let { instructorId } = body;

        // 강사가 수정할 때는 무조건 본인 ID로 강제 고정 (보안상)
        if (role === 'INSTRUCTOR') {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
                select: { id: true }
            });
            instructorId = user?.id;
        }

        if (!name || !instructorId || !subjectName || !feePerSession || !targetSessionsMonth) {
            return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
        }

        // 트랜잭션으로 학생, 부모, 그리고 첫 번째 수강 이력 수정
        await prisma.$transaction(async (tx) => {
            // 1. 학생 기본 정보 업데이트
            const updatedStudent = await tx.student.update({
                where: { id },
                data: {
                    name,
                    gender: gender || null,
                    school: school || null,
                    grade: grade ? String(grade) : null,
                    phone: phone || null,
                    shuttleStatus: shuttleStatus || "NOT_BOARDING",
                    shuttleLocation: shuttleLocation || null,
                } as any // Bypass strict TS check for new schema fields not yet generated
            });

            // 2. 학부모 정보 업데이트 (기존 삭제 후 재생성 방식 사용 - 가장 깔끔함)
            await tx.parent.deleteMany({
                where: { studentId: id }
            });

            if (parents && Array.isArray(parents) && parents.length > 0) {
                await tx.parent.createMany({
                    data: parents.map((p: any) => ({
                        studentId: id,
                        name: p.name,
                        phone: p.phone,
                        relation: p.relation || null
                    }))
                });
            }

            // 3. 첫 번째 수강 정보 업데이트 (폼이 단일 수강권 기준이므로 첫번째만 업데이트)
            // 여러 개일 경우 가장 먼저 만들어진 것을 수정
            const firstEnrollment = await tx.enrollment.findFirst({
                where: { studentId: id },
                orderBy: { createdAt: 'asc' }
            });

            if (firstEnrollment) {
                await tx.enrollment.update({
                    where: { id: firstEnrollment.id },
                    data: {
                        instructorId,
                        subjectName,
                        feePerSession: Number(feePerSession),
                        targetSessionsMonth: Number(targetSessionsMonth),
                        depositorName: depositorName || null
                    }
                });
            } else {
                // 수강 이력이 없다면 새로 생성
                await tx.enrollment.create({
                    data: {
                        studentId: id,
                        instructorId,
                        subjectName,
                        feePerSession: Number(feePerSession),
                        targetSessionsMonth: Number(targetSessionsMonth),
                        depositorName: depositorName || null
                    }
                });
            }

            return updatedStudent;
        });

        return NextResponse.json({ message: '학생 수정 완료' });
    } catch (error) {
        console.error('Update Student Error:', error);
        return NextResponse.json({ error: '학생 수정 중 오류가 발생했습니다.' }, { status: 500 });
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
        // 강사는 삭제 권한 없음
        if (role !== 'ADMIN' && role !== 'OWNER') {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        const student = await prisma.student.findUnique({
            where: { id },
            select: { creatorId: true }
        });

        if (!student) {
            return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 });
        }

        // Authorization Rule: OWNER can delete anything. ADMIN can only delete their own creations.
        if (role !== 'OWNER' && student.creatorId !== currentUser?.id) {
            return NextResponse.json({ error: '본인이 등록한 학생만 삭제할 수 있습니다.' }, { status: 403 });
        }

        await prisma.student.delete({
            where: { id }
        });

        return NextResponse.json({ message: '학생이 삭제되었습니다.' });
    } catch (error) {
        console.error('Delete Student Error:', error);
        return NextResponse.json({ error: '학생 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
