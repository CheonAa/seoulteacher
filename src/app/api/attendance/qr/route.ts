import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.json({ error: "QR 토큰이 필요합니다." }, { status: 400 });
    }

    try {
        const student = await prisma.student.findUnique({
            where: { qrToken: token },
            include: {
                enrollments: {
                    include: {
                        instructor: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        if (!student) {
            return NextResponse.json({ error: "유효하지 않은 QR 코드입니다." }, { status: 404 });
        }

        if (student.enrollments.length === 0) {
            return NextResponse.json({ error: "현재 수강 중인 과목이 없습니다." }, { status: 400 });
        }

        return NextResponse.json({ student });
    } catch (error) {
        console.error("QR token fetch error:", error);
        return NextResponse.json({ error: "QR 코드를 조회하는 중 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { token, enrollmentId } = body;

        if (!token || !enrollmentId) {
            return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
        }

        const student = await prisma.student.findUnique({
            where: { qrToken: token },
        });

        if (!student) {
            return NextResponse.json({ error: "유효하지 않은 QR 코드입니다." }, { status: 404 });
        }

        const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId, studentId: student.id },
            include: {
                student: true
            }
        });

        if (!enrollment) {
            return NextResponse.json({ error: "해당 학생의 수강 정보가 아닙니다." }, { status: 400 });
        }

        // 오늘 이미 동일 과목의 출석(PRESENT/EXCUSED)이 있는지 확인 (중복 스캔 방지)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                enrollmentId,
                date: {
                    gte: today
                },
                status: {
                    in: ["PRESENT", "EXCUSED"]
                }
            }
        });

        if (existingAttendance) {
            return NextResponse.json({ error: "오늘 이미 출석이 완료된 과목입니다." }, { status: 400 });
        }

        // Add Attendance record
        await prisma.attendance.create({
            data: {
                enrollmentId,
                status: "PRESENT",
                method: "QR_SCAN",
            }
        });

        // Update MonthlyBilling if exists
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const currentBilling = await prisma.monthlyBilling.findFirst({
            where: {
                enrollmentId,
                year: currentYear,
                month: currentMonth
            }
        });

        if (currentBilling) {
            await prisma.monthlyBilling.update({
                where: { id: currentBilling.id },
                data: {
                    attendedSessions: { increment: 1 },
                    carryOverSessions: { decrement: 1 }
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: `${enrollment.student.name} 학생의 ${enrollment.subjectName} 과목 출석이 완료되었습니다.`
        });
    } catch (error) {
        console.error("QR check-in error:", error);
        return NextResponse.json({ error: "출석 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
