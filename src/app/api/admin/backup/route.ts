import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { writeFile, readdir, mkdir, stat } from 'fs/promises';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';

let BACKUP_DIR = path.join(process.cwd(), 'backup_files');
if (process.env.VERCEL || process.env.NOW_REGION) {
    BACKUP_DIR = path.join(os.tmpdir(), 'seoulteacher_backups');
}

const EXCLUDED_DIRS = new Set([
    'node_modules',
    '.next',
    '.git',
    '.gemini',
    'tmp',
    'backup files',
    'seoulteacher_backups'
]);

const EXCLUDED_FILES = new Set([
    'test_dup.zip',
    'test_zip.zip'
]);

// 디렉토리를 AdmZip 객체에 재귀적으로 추가하는 헬퍼 함수
async function addDirectoryToZip(zip: AdmZip, localPath: string, zipPathPrefix: string) {
    try {
        const items = await readdir(localPath);
        for (const item of items) {
            if (EXCLUDED_DIRS.has(item) || EXCLUDED_FILES.has(item)) continue;
            if (item.endsWith('.zip')) continue;

            const fullPath = path.join(localPath, item);
            const itemStat = await stat(fullPath);

            if (itemStat.isDirectory()) {
                await addDirectoryToZip(zip, fullPath, path.join(zipPathPrefix, item));
            } else {
                zip.addLocalFile(fullPath, zipPathPrefix);
            }
        }
    } catch (e) {
        // 폴더가 없거나 읽기 권한 실패 시 무시
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'OWNER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            await mkdir(BACKUP_DIR, { recursive: true });
        } catch (err) {
            // ignore
        }

        const files = await readdir(BACKUP_DIR);
        const backupFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.zip'));

        const backupList = await Promise.all(backupFiles.map(async (file) => {
            const filePath = path.join(BACKUP_DIR, file);
            const fileStat = await stat(filePath);
            return {
                filename: file,
                createdAt: fileStat.mtime,
                size: fileStat.size
            };
        }));

        backupList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return NextResponse.json({ backups: backupList });
    } catch (error) {
        console.error('GET Backup List Error:', error);
        return NextResponse.json({ error: '백업 목록을 불러오지 못했습니다.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'OWNER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await mkdir(BACKUP_DIR, { recursive: true });

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'db';

        // KST 기준 날짜 포맷 (YYYYMMDD_HHMMSS)
        const date = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(date.getTime() + kstOffset);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dateString = `${kstDate.getUTCFullYear()}${pad(kstDate.getUTCMonth() + 1)}${pad(kstDate.getUTCDate())}_${pad(kstDate.getUTCHours())}${pad(kstDate.getUTCMinutes())}${pad(kstDate.getUTCSeconds())}`;

        const getDatabaseData = async () => {
            return {
                users: await prisma.user.findMany(),
                instructorProfiles: await prisma.instructorProfile.findMany(),
                students: await prisma.student.findMany(),
                enrollments: await prisma.enrollment.findMany(),
                attendances: await prisma.attendance.findMany(),
                monthlyBillings: await prisma.monthlyBilling.findMany(),
                payrolls: await prisma.payroll.findMany(),
                parents: await prisma.parent.findMany(),
                systemSettings: await prisma.systemSettings.findMany(),
                shuttleSchedules: await prisma.shuttleSchedule.findMany(),
                notices: await prisma.notice.findMany(),
                noticeAttachments: await prisma.noticeAttachment.findMany(),
                consultations: await prisma.consultation.findMany(),
                courses: await prisma.course.findMany(),
                chapters: await prisma.chapter.findMany(),
                lectures: await prisma.lecture.findMany(),
                lectureAttachments: await prisma.lectureAttachment.findMany(),
                courseEnrollments: await prisma.courseEnrollment.findMany(),
                studentLectureProgresses: await prisma.studentLectureProgress.findMany()
            };
        };

        if (type === 'db') {
            const data = await getDatabaseData();
            const jsonString = JSON.stringify(data, null, 2);
            const filename = `seoulteacher_db_backup_${dateString}.json`;
            const filePath = path.join(BACKUP_DIR, filename);

            await writeFile(filePath, jsonString, 'utf-8');

            return NextResponse.json({ 
                message: '데이터베이스 백업 파일이 생성되었습니다.',
                filename
            });

        } else if (type === 'uploads') {
            const filename = `seoulteacher_uploads_backup_${dateString}.zip`;
            const filePath = path.join(BACKUP_DIR, filename);

            const zip = new AdmZip();
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
            
            try {
                zip.addLocalFolder(uploadsDir, 'uploads');
            } catch (err) {
                // 업로드 폴더가 비어 있거나 없는 경우 플레이스홀더 파일 추가
                zip.addFile('placeholder.txt', Buffer.from('No uploads found.'));
            }
            
            zip.writeZip(filePath);

            return NextResponse.json({
                message: '앱 자료(업로드 파일) 백업 파일이 생성되었습니다.',
                filename
            });

        } else if (type === 'source') {
            const filename = `seoulteacher_source_backup_${dateString}.zip`;
            const filePath = path.join(BACKUP_DIR, filename);

            const zip = new AdmZip();
            const projectDir = process.cwd();
            await addDirectoryToZip(zip, projectDir, '');
            zip.writeZip(filePath);

            return NextResponse.json({
                message: '소스 코드 백업 파일이 생성되었습니다.',
                filename
            });

        } else if (type === 'all') {
            const filename = `seoulteacher_full_backup_${dateString}.zip`;
            const filePath = path.join(BACKUP_DIR, filename);

            const zip = new AdmZip();

            // 1. 메모리상의 DB JSON 데이터 바로 추가
            const dbData = await getDatabaseData();
            zip.addFile(`database_backup_${dateString}.json`, Buffer.from(JSON.stringify(dbData, null, 2), 'utf-8'));

            // 2. 업로드 파일 폴더 추가
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
            try {
                zip.addLocalFolder(uploadsDir, 'uploads');
            } catch (e) {
                // ignore
            }

            // 3. 프로젝트 소스 코드 파일 추가
            const projectDir = process.cwd();
            await addDirectoryToZip(zip, projectDir, '');

            zip.writeZip(filePath);

            return NextResponse.json({
                message: '전체 백업(DB, 앱 자료, 소스 코드) 파일이 생성되었습니다.',
                filename
            });
        }

        return NextResponse.json({ error: '알 수 없는 백업 종류입니다.' }, { status: 400 });
    } catch (error: any) {
        console.error('POST Create Backup Error:', error);
        return NextResponse.json({ error: `백업 생성 실패: ${error.message || error}` }, { status: 500 });
    }
}
