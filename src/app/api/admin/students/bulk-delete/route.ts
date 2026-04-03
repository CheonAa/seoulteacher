import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        // 강사는 삭제 권한 없음
        if (role !== 'ADMIN' && role !== 'OWNER') {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "삭제할 학생 ID가 누락되었습니다." }, { status: 400 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        // 1. 가져오기 및 권한 필터링
        const targetStudents = await prisma.student.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, creatorId: true }
        });

        if (targetStudents.length === 0) {
            return NextResponse.json({ error: '해당 학생들을 찾을 수 없습니다.' }, { status: 404 });
        }

        // Authorization Rule: OWNER can delete anything. ADMIN can only delete their own creations.
        const studentsToDelete = role === 'OWNER' 
            ? targetStudents 
            : targetStudents.filter(s => s.creatorId === currentUser?.id);

        if (studentsToDelete.length === 0) {
            return NextResponse.json({ error: '본인이 등록한 학생만 삭제할 수 있습니다.' }, { status: 403 });
        }

        const idsToDelete = studentsToDelete.map(s => s.id);
        const namesToDelete = studentsToDelete.map(s => s.name);

        // 차량 시간표 (ShuttleSchedule) 이름 삭제 동기화 로직 준비
        // OR 조건으로 각 학생 이름이 포함된 스케줄을 찾습니다.
        const affectedSchedules = await prisma.shuttleSchedule.findMany({
            where: {
                OR: namesToDelete.map(name => ({
                    students: { contains: name }
                }))
            }
        });

        // 트랜잭션으로 차량 시간표 이름에서 학생 제외 처리 및 학생 레코드 일괄 삭제
        await prisma.$transaction(async (tx) => {
            if (affectedSchedules.length > 0) {
                for (const schedule of affectedSchedules) {
                    if (!schedule.students) continue;

                    let studentArray = schedule.students.split(',').map((s: string) => s.trim());
                    // 기존 이름 제거
                    const updatedArray = studentArray.filter((s: string) => !namesToDelete.includes(s));
                    const newStudentsString = updatedArray.filter(Boolean).join(', ') || null;

                    await tx.shuttleSchedule.update({
                        where: { id: schedule.id },
                        data: { students: newStudentsString }
                    });
                }
            }

            // Enrollment 같은 연관 관계는 Cascade 로 자동 삭제되거나 schema 에 정의된 동작 사용. 
            // 단일 삭제와 동일하게 student.delete() 와 같이 동작함.
            await tx.student.deleteMany({
                where: { id: { in: idsToDelete } }
            });
        });

        return NextResponse.json({ 
            message: `${idsToDelete.length}명의 학생이 삭제되었습니다.`,
            deletedCount: idsToDelete.length,
            requestedCount: ids.length
        });
    } catch (error) {
        console.error('POST Bulk Delete Students Error:', error);
        return NextResponse.json({ error: '학생 일괄 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
