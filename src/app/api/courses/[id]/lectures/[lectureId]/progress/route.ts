import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string; lectureId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
        }

        const { lectureId } = await params;
        const userId = session.user.id;

        // 학생 프로필 확인
        const student = await prisma.student.findUnique({
            where: { userId },
            select: { id: true }
        });

        if (!student) {
            return NextResponse.json({ error: "학생 정보를 찾을 수 없습니다." }, { status: 404 });
        }

        const progress = await prisma.studentLectureProgress.findUnique({
            where: {
                studentId_lectureId: {
                    studentId: student.id,
                    lectureId
                }
            }
        });

        return NextResponse.json({
            isCompleted: progress ? progress.isCompleted : false,
            completedAt: progress ? progress.completedAt : null
        });
    } catch (error) {
        console.error("GET Lecture Progress Error:", error);
        return NextResponse.json({ error: "진도 정보를 가져오지 못했습니다." }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; lectureId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
        }

        const { lectureId } = await params;
        const body = await req.json();
        const { isCompleted } = body;
        const userId = session.user.id;

        // 학생 프로필 확인
        const student = await prisma.student.findUnique({
            where: { userId },
            select: { id: true }
        });

        if (!student) {
            return NextResponse.json({ error: "학생 정보를 찾을 수 없습니다." }, { status: 404 });
        }

        const updatedProgress = await prisma.studentLectureProgress.upsert({
            where: {
                studentId_lectureId: {
                    studentId: student.id,
                    lectureId
                }
            },
            update: {
                isCompleted: Boolean(isCompleted),
                completedAt: isCompleted ? new Date() : null
            },
            create: {
                studentId: student.id,
                lectureId,
                isCompleted: Boolean(isCompleted),
                completedAt: isCompleted ? new Date() : null
            }
        });

        return NextResponse.json(updatedProgress);
    } catch (error) {
        console.error("POST Lecture Progress Error:", error);
        return NextResponse.json({ error: "진도 정보를 업데이트하지 못했습니다." }, { status: 500 });
    }
}
