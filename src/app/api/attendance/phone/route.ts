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
    const phoneSuffix = searchParams.get("suffix");

    if (!phoneSuffix || phoneSuffix.length !== 4) {
        return NextResponse.json({ error: "핸드폰 번호 뒷 4자리를 정확히 입력해주세요." }, { status: 400 });
    }

    try {
        // 전화번호가 phoneSuffix로 끝나는 학생 검색 (NULL 값이 아닌 것만)
        const students = await prisma.student.findMany({
            where: {
                phone: {
                    endsWith: phoneSuffix
                }
            },
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

        if (students.length === 0) {
            return NextResponse.json({ error: "해당 번호에 등록된 학생이 없습니다." }, { status: 404 });
        }

        // 수강 내역이 있는 학생만 필터하여 응답
        const activeStudents = students.filter(s => s.enrollments.length > 0);

        if (activeStudents.length === 0) {
            return NextResponse.json({ error: "해당 번호의 학생은 현재 수강 중인 과목이 없습니다." }, { status: 400 });
        }

        return NextResponse.json({ students: activeStudents });
    } catch (error) {
        console.error("Phone search error:", error);
        return NextResponse.json({ error: "학생을 검색하는 중 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { studentId, enrollmentId } = body;

        if (!studentId || !enrollmentId) {
            return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
        }

        const student = await prisma.student.findUnique({
            where: { id: studentId },
        });

        if (!student) {
            return NextResponse.json({ error: "유효하지 않은 학생입니다." }, { status: 404 });
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

        // Add Attendance record with method 'PHONE_SEARCH'
        await prisma.attendance.create({
            data: {
                enrollmentId,
                status: "PRESENT",
                method: "PHONE_SEARCH",
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
        console.error("Phone check-in error:", error);
        return NextResponse.json({ error: "출석 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
