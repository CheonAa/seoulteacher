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
            select: { name: true, creatorId: true, enrollments: true }
        });

        if (!student) {
            return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 });
        }

        const body = await req.json();
        const { name, gender, school, grade, phone, parents, shuttleStatus, shuttleLocation, enrollments = [] } = body;

        // Authorization Rule:
        // OWNER, ADMIN: Can edit anything.
        // INSTRUCTOR: Can edit if they created the student OR if they are assigned as an instructor in the payload enrollments or existing enrollments
        if (role === 'INSTRUCTOR') {
            const isCreator = student.creatorId === currentUser?.id;
            const isAssignedInExisting = student.enrollments.some(enr => enr.instructorId === currentUser?.id);
            const isAssignedInPayload = enrollments.some((enr: any) => enr.instructorId === currentUser?.id);

            if (!isCreator && !isAssignedInExisting && !isAssignedInPayload) {
                return NextResponse.json({ error: '본인이 등록했거나 담당 중인 학생만 수정할 수 있습니다.' }, { status: 403 });
            }
        }

        if (!name || enrollments.length === 0) {
            return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
        }

        // 차량 시간표 (ShuttleSchedule) 이름 동기화 로직 준비
        const oldName = student.name;
        const nameChanged = oldName !== name;
        let affectedSchedules: any[] = [];
        
        if (nameChanged) {
            affectedSchedules = await prisma.shuttleSchedule.findMany({
                where: {
                    students: {
                        contains: oldName
                    }
                }
            });
        }

        // 트랜잭션으로 학생, 부모, 그리고 수강 이력 및 차량 시간표 전체 수정
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

            // 3. 수강 정보 업데이트 (기존 유지, 없는 것만 삭제 후 생성/수정)
            const payloadEnrollmentIds = enrollments
                .map((enr: any) => enr.id)
                .filter((enrId: any) => enrId && enrId.trim() !== "");

            // Payload에 없는 기존 수강 정보는 삭제 (단, Attendance/MonthlyBilling 도 캐스케이드 삭제되므로 주의)
            await tx.enrollment.deleteMany({
                where: { 
                    studentId: id,
                    id: { notIn: payloadEnrollmentIds }
                }
            });

            if (enrollments && Array.isArray(enrollments) && enrollments.length > 0) {
                for (const enr of enrollments) {
                    const enrData = {
                        instructorId: enr.instructorId,
                        subjectName: enr.subjectName,
                        curriculum: enr.curriculum || "KOREAN",
                        period: enr.period || "SEMESTER",
                        gradeGroup: enr.gradeGroup || "ELEM",
                        feePerSession: Number(enr.feePerSession),
                        targetSessionsMonth: Number(enr.targetSessionsMonth),
                        depositorName: enr.depositorName || null,
                        startDate: enr.startDate ? new Date(enr.startDate) : new Date(),
                        status: enr.status || "ACTIVE",
                        pausedReason: enr.pausedReason || null,
                    };

                    if (enr.id && enr.id.trim() !== "") {
                        // 기존 수강 정보 업데이트
                        await tx.enrollment.update({
                            where: { id: enr.id },
                            data: enrData
                        });
                    } else {
                        // 새로운 수강 정보 추가
                        await tx.enrollment.create({
                            data: {
                                ...enrData,
                                studentId: id
                            }
                        });
                    }
                }
            }

            // 4. 차량 시간표 이름 텍스트 교체 (이름이 변경되었을 경우만)
            if (nameChanged && affectedSchedules.length > 0) {
                for (const schedule of affectedSchedules) {
                    if (!schedule.students) continue;

                    // "홍길동, 김철수, 박영희" 같은 구조에서 정확히 이전 이름만 새 이름으로 교체
                    const studentArray = schedule.students.split(',').map((s: string) => s.trim());
                    const updatedArray = studentArray.map((s: string) => s === oldName ? name.trim() : s);
                    const newStudentsString = updatedArray.filter(Boolean).join(', ');

                    await tx.shuttleSchedule.update({
                        where: { id: schedule.id },
                        data: { students: newStudentsString }
                    });
                }
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
            select: { name: true, creatorId: true }
        });

        if (!student) {
            return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 });
        }

        // Authorization Rule: OWNER can delete anything. ADMIN can only delete their own creations.
        if (role !== 'OWNER' && student.creatorId !== currentUser?.id) {
            return NextResponse.json({ error: '본인이 등록한 학생만 삭제할 수 있습니다.' }, { status: 403 });
        }

        // 차량 시간표 (ShuttleSchedule) 이름 삭제 동기화 로직 준비
        const affectedSchedules = await prisma.shuttleSchedule.findMany({
            where: {
                students: {
                    contains: student.name
                }
            }
        });

        // 트랜잭션으로 차량 시간표 이름에서 학생 제외 처리 및 학생 레코드 삭제
        await prisma.$transaction(async (tx) => {
            if (affectedSchedules.length > 0) {
                for (const schedule of affectedSchedules) {
                    if (!schedule.students) continue;

                    const studentArray = schedule.students.split(',').map((s: string) => s.trim());
                    // 기존 이름 제거
                    const updatedArray = studentArray.filter((s: string) => s !== student.name);
                    const newStudentsString = updatedArray.filter(Boolean).join(', ') || null;

                    await tx.shuttleSchedule.update({
                        where: { id: schedule.id },
                        data: { students: newStudentsString }
                    });
                }
            }

            await tx.student.delete({
                where: { id }
            });
        });

        return NextResponse.json({ message: '학생이 삭제되었습니다.' });
    } catch (error) {
        console.error('Delete Student Error:', error);
        return NextResponse.json({ error: '학생 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
