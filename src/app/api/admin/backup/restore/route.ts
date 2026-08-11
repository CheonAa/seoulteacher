import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';

function reviveDates(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
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

// DB 복구 쿼리 트랜잭션 함수
async function restoreDatabase(data: any) {
    const operations = [
        // 자식부터 부모 순으로 삭제
        prisma.studentLectureProgress.deleteMany(),
        prisma.lectureAttachment.deleteMany(),
        prisma.lecture.deleteMany(),
        prisma.chapter.deleteMany(),
        prisma.courseEnrollment.deleteMany(),
        prisma.course.deleteMany(),
        
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

        // 부모부터 자식 순으로 생성
        ...(data.users?.length > 0 ? [prisma.user.createMany({ data: data.users })] : []),
        ...(data.instructorProfiles?.length > 0 ? [prisma.instructorProfile.createMany({ data: data.instructorProfiles })] : []),
        ...(data.systemSettings?.length > 0 ? [prisma.systemSettings.createMany({ data: data.systemSettings })] : []),
        ...(data.shuttleSchedules?.length > 0 ? [prisma.shuttleSchedule.createMany({ data: data.shuttleSchedules })] : []),
        ...(data.students?.length > 0 ? [prisma.student.createMany({ data: data.students })] : []),
        ...(data.parents?.length > 0 ? [prisma.parent.createMany({ data: data.parents })] : []),
        ...(data.notices?.length > 0 ? [prisma.notice.createMany({ data: data.notices })] : []),
        ...(data.noticeAttachments?.length > 0 ? [prisma.noticeAttachment.createMany({ data: data.noticeAttachments })] : []),
        ...(data.enrollments?.length > 0 ? [prisma.enrollment.createMany({ data: data.enrollments })] : []),
        ...(data.attendances?.length > 0 ? [prisma.attendance.createMany({ data: data.attendances })] : []),
        ...(data.monthlyBillings?.length > 0 ? [prisma.monthlyBilling.createMany({ data: data.monthlyBillings })] : []),
        ...(data.payrolls?.length > 0 ? [prisma.payroll.createMany({ data: data.payrolls })] : []),
        ...(data.consultations?.length > 0 ? [prisma.consultation.createMany({ data: data.consultations })] : []),

        // 추가된 6개 LMS 데이터 복구
        ...(data.courses?.length > 0 ? [prisma.course.createMany({ data: data.courses })] : []),
        ...(data.courseEnrollments?.length > 0 ? [prisma.courseEnrollment.createMany({ data: data.courseEnrollments })] : []),
        ...(data.chapters?.length > 0 ? [prisma.chapter.createMany({ data: data.chapters })] : []),
        ...(data.lectures?.length > 0 ? [prisma.lecture.createMany({ data: data.lectures })] : []),
        ...(data.lectureAttachments?.length > 0 ? [prisma.lectureAttachment.createMany({ data: data.lectureAttachments })] : []),
        ...(data.studentLectureProgresses?.length > 0 ? [prisma.studentLectureProgress.createMany({ data: data.studentLectureProgresses })] : [])
    ];

    await prisma.$transaction(operations);
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

        const isZip = file.name.endsWith('.zip');

        if (isZip) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // adm-zip을 사용하여 인메모리 압축 해제
            const zip = new AdmZip(buffer);
            const zipEntries = zip.getEntries();
            
            const restoredItems: string[] = [];
            const projectDir = process.cwd();

            // (A) DB JSON 복구 감지
            const dbEntry = zipEntries.find(entry => entry.entryName.endsWith('.json') && !entry.isDirectory);
            if (dbEntry) {
                const jsonText = dbEntry.getData().toString('utf8');
                const rawData = JSON.parse(jsonText);
                const revived = reviveDates(rawData);
                await restoreDatabase(revived);
                restoredItems.push('데이터베이스(LMS 포함)');
            }

            // (B) 앱 자료 (uploads) 복구 감지
            const destUploads = path.join(projectDir, 'public', 'uploads');
            let hasUploads = false;
            
            for (const entry of zipEntries) {
                if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
                    const relativePath = entry.entryName.substring('uploads/'.length);
                    const targetPath = path.join(destUploads, relativePath);
                    await mkdir(path.dirname(targetPath), { recursive: true });
                    await writeFile(targetPath, entry.getData());
                    hasUploads = true;
                }
            }
            if (hasUploads) restoredItems.push('앱 자료(업로드 파일)');

            // (C) 소스 코드 복구 감지
            const rootConfigFiles = new Set(['package.json', 'next.config.ts', 'tsconfig.json']);
            let hasSrc = false;
            
            for (const entry of zipEntries) {
                const entryName = entry.entryName;
                if (entry.isDirectory) continue;

                let shouldExtract = false;
                let targetPath = "";

                if (entryName.startsWith('src/')) {
                    shouldExtract = true;
                    targetPath = path.join(projectDir, entryName);
                } else if (entryName.startsWith('prisma/')) {
                    shouldExtract = true;
                    targetPath = path.join(projectDir, entryName);
                } else if (entryName.startsWith('public/') && !entryName.startsWith('public/uploads/')) {
                    shouldExtract = true;
                    targetPath = path.join(projectDir, entryName);
                } else if (rootConfigFiles.has(entryName)) {
                    shouldExtract = true;
                    targetPath = path.join(projectDir, entryName);
                }

                if (shouldExtract) {
                    await mkdir(path.dirname(targetPath), { recursive: true });
                    await writeFile(targetPath, entry.getData());
                    hasSrc = true;
                }
            }
            if (hasSrc) restoredItems.push('소스 코드');

            if (restoredItems.length === 0) {
                return NextResponse.json({ error: '백업 파일 내에서 복구 가능한 자료(DB, uploads, src)를 찾을 수 없습니다.' }, { status: 400 });
            }

            return NextResponse.json({ 
                message: `성공적으로 복구되었습니다. 복구 내역: [${restoredItems.join(', ')}]. 변경사항 반영을 위해 새로고침됩니다.`
            });

        } else {
            // --- 기존 단일 JSON DB 복구 로직 ---
            const text = await file.text();
            const rawData = JSON.parse(text);
            const data = reviveDates(rawData);

            if (!data.users || !data.students || !data.systemSettings) {
                return NextResponse.json({ error: '유효하지 않은 백업 파일 포맷입니다.' }, { status: 400 });
            }

            await restoreDatabase(data);

            return NextResponse.json({ message: '데이터베이스가 성공적으로 복구되었습니다.' });
        }

    } catch (error: any) {
        console.error('POST Backup Restore Error:', error);
        return NextResponse.json({ error: `복구 실패: ${error.message || error}` }, { status: 500 });
    }
}
