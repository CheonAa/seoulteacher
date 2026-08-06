import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN" && session.user.role !== "INSTRUCTOR")) {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const { id: courseId } = await params;

        // 1. 해당 코스에 이미 등록된 학생 목록 조회
        const enrolledStudents = await prisma.courseEnrollment.findMany({
            where: { courseId },
            include: {
                student: {
                    select: { id: true, name: true, school: true, grade: true }
                }
            }
        });

        // 2. 전체 학원 학생 목록 조회 (수강 신청에 추가할 대상을 고르기 위함)
        const allStudents = await prisma.student.findMany({
            select: { id: true, name: true, school: true, grade: true },
            orderBy: { name: "asc" }
        });

        return NextResponse.json({
            enrolled: enrolledStudents.map(e => e.student),
            all: allStudents
        });
    } catch (error) {
        console.error("GET Course Enrollments Error:", error);
        return NextResponse.json({ error: "수강자 정보를 가져오지 못했습니다." }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN" && session.user.role !== "INSTRUCTOR")) {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const { id: courseId } = await params;
        const body = await req.json();
        const { studentIds } = body; // 수강 신청할 학생들의 ID 배열

        if (!studentIds || !Array.isArray(studentIds)) {
            return NextResponse.json({ error: "올바르지 않은 학생 ID 데이터 형식입니다." }, { status: 400 });
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId }
        });

        if (!course) {
            return NextResponse.json({ error: "강좌를 찾을 수 없습니다." }, { status: 404 });
        }

        if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
            return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
        }

        // 수강 명단을 갱신하는 트랜잭션 수행
        await prisma.$transaction(async (tx) => {
            // 1. 기존 수강 명단 삭제
            await tx.courseEnrollment.deleteMany({
                where: { courseId }
            });

            // 2. 새 수강 명단 매핑 추가
            if (studentIds.length > 0) {
                await tx.courseEnrollment.createMany({
                    data: studentIds.map(studentId => ({
                        courseId,
                        studentId
                    }))
                });
            }
        });

        return NextResponse.json({ message: "수강생 명단이 성공적으로 업데이트되었습니다." });
    } catch (error) {
        console.error("POST Course Enrollments Error:", error);
        return NextResponse.json({ error: "수강생 목록 업데이트에 실패했습니다." }, { status: 500 });
    }
}
