import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { writeFile, readdir, mkdir, stat, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const BACKUP_DIR = path.join(os.tmpdir(), 'seoulteacher_backups');

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
        // JSON 및 ZIP 파일 모두 목록화
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

        // Sort descending by creation date
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

        // Parse query parameter or body parameter
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'db'; // db, uploads, source, all

        // KST 기준 날짜 포맷 (YYYYMMDD_HHMMSS)
        const date = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(date.getTime() + kstOffset);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dateString = `${kstDate.getUTCFullYear()}${pad(kstDate.getUTCMonth() + 1)}${pad(kstDate.getUTCDate())}_${pad(kstDate.getUTCHours())}${pad(kstDate.getUTCMinutes())}${pad(kstDate.getUTCSeconds())}`;

        // 1. Database Backup helper
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
                // 추가된 6개 LMS 테이블 백업 포함
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

            // Compress public/uploads using powershell
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
            await execPromise(`powershell -Command "Compress-Archive -Path '${uploadsDir}' -DestinationPath '${filePath}' -Force"`);

            return NextResponse.json({
                message: '앱 자료(업로드 파일) 백업 파일이 생성되었습니다.',
                filename
            });

        } else if (type === 'source') {
            const filename = `seoulteacher_source_backup_${dateString}.zip`;
            const filePath = path.join(BACKUP_DIR, filename);

            // Compress source files, excluding bulky folders using powershell
            const projectDir = process.cwd();
            await execPromise(`powershell -Command "Get-ChildItem -Path '${projectDir}' -Exclude 'node_modules', '.next', '.git', '.gemini', 'tmp', '*.zip', 'backup files' | Compress-Archive -DestinationPath '${filePath}' -Force"`);

            return NextResponse.json({
                message: '소스 코드 백업 파일이 생성되었습니다.',
                filename
            });

        } else if (type === 'all') {
            const filename = `seoulteacher_full_backup_${dateString}.zip`;
            const filePath = path.join(BACKUP_DIR, filename);

            // 1. Write DB JSON to a temp file
            const dbData = await getDatabaseData();
            const tempDbPath = path.join(BACKUP_DIR, `database_backup_${dateString}.json`);
            await writeFile(tempDbPath, JSON.stringify(dbData, null, 2), 'utf-8');

            // 2. Compress DB JSON, uploads, and source code together
            const projectDir = process.cwd();
            const uploadsDir = path.join(projectDir, 'public', 'uploads');
            
            await execPromise(`powershell -Command "Compress-Archive -Path '${uploadsDir}', '${projectDir}\\src', '${projectDir}\\prisma', '${projectDir}\\public', '${projectDir}\\package.json', '${projectDir}\\next.config.ts', '${projectDir}\\tsconfig.json', '${tempDbPath}' -DestinationPath '${filePath}' -Force"`);

            // 3. Clean up the temp DB file
            await unlink(tempDbPath);

            return NextResponse.json({
                message: '전체 백업(DB, 앱 자료, 소스 코드) 파일이 생성되었습니다.',
                filename
            });
        }

        return NextResponse.json({ error: '알 수 없는 백업 종류입니다.' }, { status: 400 });
    } catch (error) {
        console.error('POST Create Backup Error:', error);
        return NextResponse.json({ error: '백업 생성에 실패했습니다.' }, { status: 500 });
    }
}
