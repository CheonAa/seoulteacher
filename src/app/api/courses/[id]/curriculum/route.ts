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

        const { id: courseId } = await params;

        const chapters = await prisma.chapter.findMany({
            where: { courseId },
            orderBy: { order: "asc" },
            include: {
                lectures: {
                    orderBy: { order: "asc" },
                    include: {
                        attachments: true
                    }
                }
            }
        });

        return NextResponse.json(chapters);
    } catch (error) {
        console.error("GET Curriculum Error:", error);
        return NextResponse.json({ error: "커리큘럼 정보를 가져오지 못했습니다." }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN" && session.user.role !== "INSTRUCTOR")) {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const { id: courseId } = await params;
        const body = await req.json();
        const { chapters } = body;

        if (!chapters || !Array.isArray(chapters)) {
            return NextResponse.json({ error: "올바르지 않은 커리큘럼 데이터 형식입니다." }, { status: 400 });
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

        // 트랜잭션을 통해 기존 데이터를 안전하게 삭제 후 다시 생성
        const updatedChapters = await prisma.$transaction(async (tx) => {
            // 1. 기존 챕터 목록 삭제 (종속된 강의, 첨부파일 등은 schema.prisma의 onDelete: Cascade 설정으로 자동 일괄 삭제됨)
            await tx.chapter.deleteMany({
                where: { courseId }
            });

            // 2. 새 챕터 및 세부 강의 정보 빌드
            const createdChapters = [];
            for (let i = 0; i < chapters.length; i++) {
                const ch = chapters[i];
                const newChapter = await tx.chapter.create({
                    data: {
                        courseId,
                        title: ch.title,
                        order: ch.order ?? i + 1,
                    }
                });

                if (ch.lectures && Array.isArray(ch.lectures)) {
                    for (let j = 0; j < ch.lectures.length; j++) {
                        const lec = ch.lectures[j];
                        const newLecture = await tx.lecture.create({
                            data: {
                                chapterId: newChapter.id,
                                title: lec.title,
                                order: lec.order ?? j + 1,
                                type: lec.type || "VOD",
                                videoUrl: lec.videoUrl || null,
                                liveUrl: lec.liveUrl || null,
                                liveStartTime: lec.liveStartTime ? new Date(lec.liveStartTime) : null,
                                content: lec.content || null
                            }
                        });

                        if (lec.attachments && Array.isArray(lec.attachments)) {
                            for (const att of lec.attachments) {
                                await tx.lectureAttachment.create({
                                    data: {
                                        lectureId: newLecture.id,
                                        name: att.name,
                                        url: att.url
                                    }
                                });
                            }
                        }
                    }
                }

                // 생성된 데이터를 조회하여 배열에 수집
                const fullChapter = await tx.chapter.findUnique({
                    where: { id: newChapter.id },
                    include: {
                        lectures: {
                            orderBy: { order: "asc" },
                            include: {
                                attachments: true
                            }
                        }
                    }
                });
                if (fullChapter) createdChapters.push(fullChapter);
            }

            return createdChapters;
        });

        return NextResponse.json(updatedChapters);
    } catch (error) {
        console.error("PUT Curriculum Error:", error);
        return NextResponse.json({ error: "커리큘럼 저장에 실패했습니다." }, { status: 500 });
    }
}
