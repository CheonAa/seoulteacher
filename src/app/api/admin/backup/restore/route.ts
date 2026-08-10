import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, rm, readdir, readFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const BACKUP_DIR = path.join(os.tmpdir(), 'seoulteacher_backups');

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
    // 19개 모델에 대해 정확한 관계성 순서대로 Cascade 삭제 및 새 데이터 입력 수행
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
    let tempZipPath = '';
    let tempExtractDir = '';

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
            // --- ZIP 복구 로직 (DB JSON, 업로드 파일, 소스 코드 등 복구) ---
            
            // 1. 임시 경로 생성
            tempZipPath = path.join(BACKUP_DIR, `temp_restore_${Date.now()}.zip`);
            tempExtractDir = path.join(BACKUP_DIR, `temp_extract_${Date.now()}`);
            await mkdir(BACKUP_DIR, { recursive: true });
            await mkdir(tempExtractDir, { recursive: true });

            // 2. 파일 저장
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await writeFile(tempZipPath, buffer);

            // 3. 압축 해제
            await execPromise(`powershell -Command "Expand-Archive -Path '${tempZipPath}' -DestinationPath '${tempExtractDir}' -Force"`);

            // 4. 내용물 감지 및 복구 진행
            const extractedFiles = await readdir(tempExtractDir);
            let restoredItems = [];

            // (A) DB 데이터 복구
            const jsonFile = extractedFiles.find(f => f.endsWith('.json'));
            if (jsonFile) {
                const jsonPath = path.join(tempExtractDir, jsonFile);
                const jsonText = await readFile(jsonPath, 'utf8');
                const rawData = JSON.parse(jsonText);
                const revived = reviveDates(rawData);
                await restoreDatabase(revived);
                restoredItems.push('데이터베이스(LMS 포함)');
            }

            // (B) 앱 자료 (uploads) 복구
            const projectDir = process.cwd();
            const hasUploads = extractedFiles.includes('uploads');
            if (hasUploads) {
                const sourceUploads = path.join(tempExtractDir, 'uploads');
                const destUploads = path.join(projectDir, 'public', 'uploads');
                await mkdir(destUploads, { recursive: true });
                await execPromise(`powershell -Command "Copy-Item -Path '${sourceUploads}\\*' -Destination '${destUploads}' -Recurse -Force"`);
                restoredItems.push('앱 자료(업로드 파일)');
            }

            // (C) 소스 코드 (src) 복구
            const hasSrc = extractedFiles.includes('src');
            if (hasSrc) {
                // src 및 설정 파일 복구
                const sourceSrc = path.join(tempExtractDir, 'src');
                const destSrc = path.join(projectDir, 'src');
                await execPromise(`powershell -Command "Copy-Item -Path '${sourceSrc}\\*' -Destination '${destSrc}' -Recurse -Force"`);

                // 추가 개별 루트 파일들 복구
                const rootFiles = ['package.json', 'next.config.ts', 'tsconfig.json'];
                for (const rf of rootFiles) {
                    if (extractedFiles.includes(rf)) {
                        await execPromise(`powershell -Command "Copy-Item -Path '${path.join(tempExtractDir, rf)}' -Destination '${path.join(projectDir, rf)}' -Force"`);
                    }
                }
                restoredItems.push('소스 코드');
            }

            // 청소
            try {
                await unlinkFile(tempZipPath);
                await rm(tempExtractDir, { recursive: true, force: true });
            } catch (e) {
                // ignore clean errors
            }

            return NextResponse.json({ 
                message: `성공적으로 복구되었습니다. 복구 내역: [${restoredItems.join(', ')}]. 서버 재시작 반영을 위해 새로고침됩니다.`
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

    } catch (error) {
        console.error('POST Backup Restore Error:', error);
        return NextResponse.json({ error: '복구 중 치명적인 오류가 발생했습니다. 백업 파일이 손상되었거나 서버 오류일 수 있습니다.' }, { status: 500 });
    }
}

// Helper unlink
async function unlinkFile(filePath: string) {
    try {
        await unlink(filePath);
    } catch (e) {}
}
