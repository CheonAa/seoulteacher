import { prisma } from '@/lib/prisma';

const SUBJECT_BY_INSTRUCTOR_NAME: Record<
    string,
    {
        subjectName: string;
        curriculum: string;
        period: string;
        gradeGroup: string;
        targetSessionsMonth: number;
        feePerSession: number;
    }
> = {
    '유재숙(수학)': {
        subjectName: '중등 수학',
        curriculum: 'KOREAN',
        period: 'SEMESTER',
        gradeGroup: 'MID',
        targetSessionsMonth: 8,
        feePerSession: 937500
    },
    '강용구': {
        subjectName: '고등 수학',
        curriculum: 'KOREAN',
        period: 'SEMESTER',
        gradeGroup: 'HIGH',
        targetSessionsMonth: 8,
        feePerSession: 1000000
    },
    '최남규': {
        subjectName: '인터수학',
        curriculum: 'INTERNATIONAL',
        period: 'SEMESTER',
        gradeGroup: 'G10_12',
        targetSessionsMonth: 8,
        feePerSession: 1562500
    },
    '토마스': {
        subjectName: '내신 영어',
        curriculum: 'KOREAN',
        period: 'SEMESTER',
        gradeGroup: 'MID',
        targetSessionsMonth: 8,
        feePerSession: 937500
    }
};

const DEFAULT_SUBJECT_NAMES = new Set([
    '중등 수학',
    '고등 수학',
    '인터수학',
    '내신 영어',
    '수강 과목 미지정',
    ''
]);

/**
 * 수강료 관리(DepositRecord)의 최근 입금일자를 기준으로
 * 학생 관리(Enrollment) 및 강사 관리의 담당 강사 매칭을 동기화합니다.
 */
export async function syncStudentInstructorFromLatestDeposit(studentId: string | null | undefined) {
    if (!studentId) return;

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            enrollments: {
                where: { status: 'ACTIVE' },
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!student) return;

    // 해당 학생과 연결된 최근 입금 내역(담당 강사가 지정된 내역) 조회
    const latestDeposit = await prisma.depositRecord.findFirst({
        where: {
            instructorId: { not: null },
            OR: [
                { studentId: student.id },
                { matchedStudentName: { contains: student.name } }
            ]
        },
        include: {
            instructor: { select: { id: true, name: true } }
        },
        orderBy: [
            { depositDate: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    if (!latestDeposit || !latestDeposit.instructorId || !latestDeposit.instructor) {
        return;
    }

    const instName = latestDeposit.instructor.name;
    const defaults = SUBJECT_BY_INSTRUCTOR_NAME[instName] || {
        subjectName: '수강 과목 미지정',
        curriculum: 'KOREAN',
        period: 'SEMESTER',
        gradeGroup: 'MID',
        targetSessionsMonth: 8,
        feePerSession: 937500
    };

    const activeEnrollments = student.enrollments;

    if (activeEnrollments.length === 0) {
        await prisma.enrollment.create({
            data: {
                studentId: student.id,
                instructorId: latestDeposit.instructorId,
                subjectName: defaults.subjectName,
                curriculum: defaults.curriculum,
                period: defaults.period,
                gradeGroup: defaults.gradeGroup,
                feePerSession: defaults.feePerSession,
                targetSessionsMonth: defaults.targetSessionsMonth,
                startDate: latestDeposit.depositDate,
                status: 'ACTIVE'
            }
        });
    } else if (
        activeEnrollments.length === 1 &&
        activeEnrollments[0].instructorId !== latestDeposit.instructorId
    ) {
        const currentEnr = activeEnrollments[0];
        const shouldUpdateSubject = DEFAULT_SUBJECT_NAMES.has((currentEnr.subjectName || '').trim());

        await prisma.enrollment.update({
            where: { id: currentEnr.id },
            data: {
                instructorId: latestDeposit.instructorId,
                ...(shouldUpdateSubject ? { subjectName: defaults.subjectName } : {})
            }
        });
    }
}
