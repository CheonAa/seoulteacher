import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
        }

        const { id } = await params;
        const role = session.user.role;
        const userId = session.user.id;

        const course = await prisma.course.findUnique({
            where: { id },
            include: {
                instructor: {
                    select: { name: true, id: true }
                },
                chapters: {
                    orderBy: { order: "asc" },
                    include: {
                        lectures: {
                            orderBy: { order: "asc" },
                            include: {
                                attachments: true
                            }
                        }
                    }
                }
            }
        });

        if (!course) {
            return NextResponse.json({ error: "강좌를 찾을 수 없습니다." }, { status: 404 });
        }

        // 권한 분기: 강사는 본인 강좌만 조회/편집 가능 (관리자/원장은 예외, 학생은 본인이 수강신청된 강좌만 조회)
        if (role === "INSTRUCTOR" && course.instructorId !== userId) {
            return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
        }

        if (role === "STUDENT") {
            const student = await prisma.student.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!student) {
                return NextResponse.json({ error: "학생 정보를 찾을 수 없습니다." }, { status: 404 });
            }

            const enrollment = await prisma.courseEnrollment.findUnique({
                where: {
                    courseId_studentId: {
                        courseId: id,
                        studentId: student.id
                    }
                }
            });

            if (!enrollment) {
                return NextResponse.json({ error: "수강 신청되지 않은 강좌입니다." }, { status: 403 });
            }
        }

        return NextResponse.json(course);
    } catch (error) {
        console.error("GET Course Detail Error:", error);
        return NextResponse.json({ error: "강좌 정보를 가져오지 못했습니다." }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN" && session.user.role !== "INSTRUCTOR")) {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const { title, description, thumbnailUrl, instructorId } = body;

        const course = await prisma.course.findUnique({
            where: { id }
        });

        if (!course) {
            return NextResponse.json({ error: "강좌를 찾을 수 없습니다." }, { status: 404 });
        }

        // 강사 역할일 때 권한 체크
        if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
            return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
        }

        const targetInstructorId = session.user.role === "INSTRUCTOR" ? session.user.id : (instructorId || course.instructorId);

        const updatedCourse = await prisma.course.update({
            where: { id },
            data: {
                title: title || course.title,
                description: description !== undefined ? description : course.description,
                thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : course.thumbnailUrl,
                instructorId: targetInstructorId
            }
        });

        return NextResponse.json(updatedCourse);
    } catch (error) {
        console.error("PUT Course Error:", error);
        return NextResponse.json({ error: "강좌 수정에 실패했습니다." }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN" && session.user.role !== "INSTRUCTOR")) {
            return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
        }

        const { id } = await params;
        const course = await prisma.course.findUnique({
            where: { id }
        });

        if (!course) {
            return NextResponse.json({ error: "강좌를 찾을 수 없습니다." }, { status: 404 });
        }

        if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
            return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
        }

        await prisma.course.delete({
            where: { id }
        });

        return NextResponse.json({ message: "성공적으로 삭제되었습니다." });
    } catch (error) {
        console.error("DELETE Course Error:", error);
        return NextResponse.json({ error: "강좌 삭제에 실패했습니다." }, { status: 500 });
    }
}
