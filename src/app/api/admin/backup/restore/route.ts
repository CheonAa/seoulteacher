import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

function reviveDates(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        // Match ISO 8601 Date strings (e.g., "2023-10-01T12:00:00.000Z")
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
        if (isoDateRegex.test(obj)) {
            return new Date(obj);
        }
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(reviveDates);
    }
    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = reviveDates(obj[key]);
        }
        return newObj;
    }
    return obj;
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'OWNER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: '업로드된 파일이 없습니다.' }, { status: 400 });
        }

        const text = await file.text();
        const rawData = JSON.parse(text);
        const data = reviveDates(rawData);

        // 데이터 검증 (최소한의 필수 키 확인)
        if (!data.users || !data.students || !data.systemSettings) {
            return NextResponse.json({ error: '유효하지 않은 백업 파일 포맷입니다.' }, { status: 400 });
        }

        // 트랜잭션 배열 생성 (배열 기반 트랜잭션은 PgBouncer에서도 단일 쿼리로 실행되어 안전함)
        const operations = [
            // 1. 기존 데이터 모두 삭제 (자식부터 부모 순으로)
            prisma.consultation.deleteMany(),
            prisma.noticeAttachment.deleteMany(),
            prisma.monthlyBilling.deleteMany(),
            prisma.attendance.deleteMany(),
            prisma.payroll.deleteMany(),
            prisma.enrollment.deleteMany(),
            prisma.parent.deleteMany(),
            prisma.shuttleSchedule.deleteMany(),
            prisma.notice.deleteMany(),
            prisma.student.deleteMany(),
            prisma.instructorProfile.deleteMany(),
            prisma.systemSettings.deleteMany(),
            prisma.user.deleteMany(),

            // 2. 새 데이터 삽입 (부모부터 자식 순으로)
            // 빈 배열일 경우 createMany가 실행되지 않도록 조건부 처리할 필요는 없음 (빈 배열은 무시됨)
            ...(data.users.length > 0 ? [prisma.user.createMany({ data: data.users })] : []),
            ...(data.instructorProfiles.length > 0 ? [prisma.instructorProfile.createMany({ data: data.instructorProfiles })] : []),
            ...(data.systemSettings.length > 0 ? [prisma.systemSettings.createMany({ data: data.systemSettings })] : []),
            ...(data.shuttleSchedules.length > 0 ? [prisma.shuttleSchedule.createMany({ data: data.shuttleSchedules })] : []),
            ...(data.students.length > 0 ? [prisma.student.createMany({ data: data.students })] : []),
            ...(data.parents.length > 0 ? [prisma.parent.createMany({ data: data.parents })] : []),
            ...(data.notices.length > 0 ? [prisma.notice.createMany({ data: data.notices })] : []),
            ...(data.noticeAttachments.length > 0 ? [prisma.noticeAttachment.createMany({ data: data.noticeAttachments })] : []),
            ...(data.enrollments.length > 0 ? [prisma.enrollment.createMany({ data: data.enrollments })] : []),
            ...(data.attendances.length > 0 ? [prisma.attendance.createMany({ data: data.attendances })] : []),
            ...(data.monthlyBillings.length > 0 ? [prisma.monthlyBilling.createMany({ data: data.monthlyBillings })] : []),
            ...(data.payrolls.length > 0 ? [prisma.payroll.createMany({ data: data.payrolls })] : []),
            ...(data.consultations.length > 0 ? [prisma.consultation.createMany({ data: data.consultations })] : [])
        ];

        await prisma.$transaction(operations);

        return NextResponse.json({ message: '데이터베이스가 성공적으로 복구되었습니다.' });

    } catch (error) {
        console.error('POST Backup Restore Error:', error);
        return NextResponse.json({ error: '복구 중 치명적인 오류가 발생했습니다. 백업 파일이 손상되었거나 서버 오류일 수 있습니다.' }, { status: 500 });
    }
}
