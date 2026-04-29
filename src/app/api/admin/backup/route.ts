import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { writeFile, readdir, mkdir, stat } from 'fs/promises';
import path from 'path';
import os from 'os';

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
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        const backupList = await Promise.all(jsonFiles.map(async (file) => {
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

        // Prisma 데이터 수집
        const data = {
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
        };

        const jsonString = JSON.stringify(data, null, 2);
        
        // KST 기준 날짜 포맷 (YYYYMMDD_HHMMSS)
        const date = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(date.getTime() + kstOffset);
        
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dateString = `${kstDate.getUTCFullYear()}${pad(kstDate.getUTCMonth() + 1)}${pad(kstDate.getUTCDate())}_${pad(kstDate.getUTCHours())}${pad(kstDate.getUTCMinutes())}${pad(kstDate.getUTCSeconds())}`;
        
        const filename = `seoulteacher_backup_${dateString}.json`;
        const filePath = path.join(BACKUP_DIR, filename);

        await writeFile(filePath, jsonString, 'utf-8');

        return NextResponse.json({ 
            message: '백업 파일이 생성되었습니다.',
            filename
        });
    } catch (error) {
        console.error('POST Create Backup Error:', error);
        return NextResponse.json({ error: '백업 생성에 실패했습니다.' }, { status: 500 });
    }
}
