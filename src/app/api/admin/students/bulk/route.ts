import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (role !== 'ADMIN' && role !== 'OWNER') {
            return NextResponse.json({ error: '관리자 또는 원장님만 일괄 등록을 사용할 수 있습니다.' }, { status: 403 });
        }

        const instructors = await prisma.user.findMany({
            where: { role: { in: ['INSTRUCTOR', 'OWNER', 'ADMIN'] } },
            select: { id: true, email: true, name: true }
        });

        // Fee calculation logic matched from frontend
        const calculateFee = (curriculum: string, period: string, gradeGroup: string, sessions: number) => {
            let fee = 0;
            if (curriculum === 'KOREAN') {
                if (period === 'SEMESTER') {
                    if (gradeGroup === 'ELEM') {
                        if (sessions === 8) fee = 7000000;
                        else if (sessions === 12) fee = 9400000;
                    } else if (gradeGroup === 'MID') {
                        if (sessions === 8) fee = 7500000;
                        else if (sessions === 12) fee = 10500000;
                    } else if (gradeGroup === 'HIGH') {
                        if (sessions === 8) fee = 8000000;
                        else if (sessions === 12) fee = 11000000;
                    }
                } else if (period === 'VACATION') {
                    if (gradeGroup === 'ELEM') {
                        if (sessions === 12) fee = 9400000;
                        else if (sessions === 18) fee = 14100000;
                        else if (sessions === 24) fee = 15980000;
                        else if (sessions === 30) fee = 18800000;
                    } else if (gradeGroup === 'MID') {
                        if (sessions === 12) fee = 10500000;
                        else if (sessions === 18) fee = 15750000;
                        else if (sessions === 24) fee = 17850000;
                        else if (sessions === 30) fee = 21000000;
                    } else if (gradeGroup === 'HIGH') {
                        if (sessions === 12) fee = 11000000;
                        else if (sessions === 18) fee = 16500000;
                        else if (sessions === 24) fee = 18700000;
                        else if (sessions === 30) fee = 22000000;
                    }
                }
            } else if (curriculum === 'INTERNATIONAL') {
                const base8 = gradeGroup === 'G7_9' ? 11000000 : 12500000;
                const perSession = base8 / 8;
                if (period === 'SEMESTER') {
                    if (sessions === 8) fee = base8;
                } else if (period === 'VACATION') {
                    if (sessions === 12) fee = (base8 + (4 * perSession)) * 0.9;
                    else if (sessions === 20) fee = (base8 + (12 * perSession)) * 0.8;
                }
            }
            return fee;
        };

        const body = await req.json();
        const students = body; // Array coming directly from ExcelStudentUploader

        if (!students || !Array.isArray(students) || students.length === 0) {
            return NextResponse.json({ error: '등록할 학생 데이터가 없습니다.' }, { status: 400 });
        }

        let creatorId = null;
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });
        if (currentUser) creatorId = currentUser.id;

        await prisma.$transaction(async (tx) => {
            for (const s of students) {
                if (!s.name || !s.enrollments || s.enrollments.length === 0) {
                    throw new Error(`학생명 및 수강 정보는 필수입니다. (${s.name || '이름 없음'})`);
                }

                // Prepare parents data
                const parentsData = s.parents.map((p: any) => ({
                    name: p.name,
                    englishName: p.englishName || null,
                    phone: p.phone,
                    relation: p.relation
                }));

                // Prepare enrollments data
                const enrollmentsData = s.enrollments.map((enr: any) => {
                    // Find instructor by email or name
                    const inst = instructors.find(i => 
                        i.email.toLowerCase() === enr.instructorEmail.toLowerCase() || 
                        i.name === enr.instructorEmail
                    );
                    
                    if (!inst) {
                        throw new Error(`강사 정보를 찾을 수 없습니다: ${enr.instructorEmail} (학생: ${s.name})`);
                    }

                    // Auto-calculate fee if not provided
                    let finalFeePerSession = enr.feePerSession;
                    if (finalFeePerSession === null || finalFeePerSession === undefined || isNaN(finalFeePerSession)) {
                        const totalFee = calculateFee(enr.curriculum, enr.period, enr.gradeGroup, enr.targetSessionsMonth);
                        finalFeePerSession = totalFee > 0 ? Math.round(totalFee / enr.targetSessionsMonth) : 0;
                    }

                    return {
                        instructorId: inst.id,
                        subjectName: enr.subjectName,
                        curriculum: enr.curriculum,
                        period: enr.period,
                        gradeGroup: enr.gradeGroup,
                        feePerSession: finalFeePerSession,
                        targetSessionsMonth: enr.targetSessionsMonth,
                        depositorName: enr.depositorName || null,
                        accountNumber: enr.accountNumber || null,
                        carryOverSessions: Number(enr.carryOverSessions) || 0,
                        carryOverAmount: Number(enr.carryOverAmount) || 0,
                        startDate: enr.startDate ? new Date(enr.startDate) : new Date(),
                        status: "ACTIVE"
                    };
                });

                let existingStudent = null;
                if (s.name && s.phone) {
                    existingStudent = await tx.student.findFirst({
                        where: { name: s.name, phone: s.phone }
                    });
                }

                if (existingStudent) {
                    // 1. Add enrollments
                    for (const enrData of enrollmentsData) {
                        await tx.enrollment.create({
                            data: {
                                ...enrData,
                                studentId: existingStudent.id
                            }
                        });
                    }

                    // 2. Add parents
                    for (const p of parentsData) {
                        const existingParent = await tx.parent.findFirst({
                            where: { studentId: existingStudent.id, name: p.name, phone: p.phone }
                        });
                        if (!existingParent) {
                            await tx.parent.create({
                                data: { ...p, studentId: existingStudent.id }
                            });
                        }
                    }
                } else {
                    // Workaround for `any` type issues with prisma generated types not matching new schemas locally
                    const studentCreatePayload: any = {
                        data: {
                            name: s.name,
                            englishName: s.englishName || null,
                            gender: s.gender || null,
                            school: s.school || null,
                            grade: s.grade || null,
                            phone: s.phone || null,
                            qrToken: uuidv4(),
                            shuttleStatus: s.shuttleStatus || "NOT_BOARDING",
                            shuttleLocation: s.shuttleLocation || null,
                            creatorId,
                            parents: { create: parentsData },
                            enrollments: { create: enrollmentsData }
                        }
                    };
                    
                    await tx.student.create(studentCreatePayload);
                }
            }
        });

        return NextResponse.json({ message: '학생 일괄 등록 완료' });
    } catch (error: any) {
        console.error('Bulk Students Error:', error);
        return NextResponse.json({ error: error.message || '학생 일괄 등록 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
