import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
        }

        const role = session.user.role;
        const userId = session.user.id;

        let courses = [];

        if (role === "STUDENT") {
            // 학생의 경우, 본인이 수강 신청된 강좌 정보만 조회
            const student = await prisma.student.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!student) {
                return NextResponse.json({ error: "연결된 학생 프로필을 찾을 수 없습니다." }, { status: 404 });
            }

            const enrollments = await prisma.courseEnrollment.findMany({
                where: { studentId: student.id },
                include: {
                    course: {
                        include: {
                            instructor: {
                                select: { name: true }
                            },
                            chapters: {
                                include: {
                                    lectures: {
                                        include: {
                                            progresses: {
                                                where: { studentId: student.id }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            courses = enrollments.map(e => {
                // Calculate progress
                let totalLectures = 0;
                let completedLectures = 0;
                e.course.chapters.forEach(ch => {
                    ch.lectures.forEach(lec => {
                        totalLectures++;
                        if (lec.progresses.some(p => p.isCompleted)) {
                            completedLectures++;
                        }
                    });
                });

                return {
                    id: e.course.id,
                    title: e.course.title,
                    description: e.course.description,
                    thumbnailUrl: e.course.thumbnailUrl,
                    instructorName: e.course.instructor.name,
                    progress: totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0,
                    totalLectures,
                    completedLectures
                };
            });

        } else if (role === "INSTRUCTOR") {
            // 강사의 경우, 본인이 생성한 강좌 조회
            courses = await prisma.course.findMany({
                where: { instructorId: userId },
                include: {
                    instructor: { select: { name: true } },
                    _count: { select: { enrollments: true } }
                },
                orderBy: { createdAt: "desc" }
            });
        } else {
            // 원장/관리자의 경우, 모든 강좌 조회
            courses = await prisma.course.findMany({
                include: {
                    instructor: { select: { name: true } },
                    _count: { select: { enrollments: true } }
                },
                orderBy: { createdAt: "desc" }
            });
        }

        return NextResponse.json(courses);
    } catch (error) {
        console.error("GET Courses Error:", error);
        return NextResponse.json({ error: "강좌 목록을 불러오지 못했습니다." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN" && session.user.role !== "INSTRUCTOR")) {
            return NextResponse.json({ error: "생성 권한이 없습니다." }, { status: 403 });
        }

        const body = await req.json();
        const { title, description, thumbnailUrl, instructorId } = body;

        if (!title) {
            return NextResponse.json({ error: "강좌 제목을 입력해주세요." }, { status: 400 });
        }

        // 강사 역할일 경우 강제적으로 본인 ID 사용
        const targetInstructorId = session.user.role === "INSTRUCTOR" ? session.user.id : (instructorId || session.user.id);

        const newCourse = await prisma.course.create({
            data: {
                title,
                description,
                thumbnailUrl,
                instructorId: targetInstructorId
            }
        });

        return NextResponse.json(newCourse, { status: 201 });
    } catch (error) {
        console.error("POST Course Error:", error);
        return NextResponse.json({ error: "강좌를 생성하지 못했습니다." }, { status: 500 });
    }
}
