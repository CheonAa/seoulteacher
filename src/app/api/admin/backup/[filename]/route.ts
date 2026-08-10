import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { unlink, readFile } from 'fs/promises';
import path from 'path';
import os from 'os';

const BACKUP_DIR = path.join(os.tmpdir(), 'seoulteacher_backups');

export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
    try {
        const { filename } = await params;
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'OWNER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 보안: 경로 탐색 공격 방지
        const safeFilename = path.basename(filename);
        const filePath = path.join(BACKUP_DIR, safeFilename);

        const contentType = safeFilename.endsWith('.zip') ? 'application/zip' : 'application/json';
        const fileBuffer = await readFile(filePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${safeFilename}"`
            }
        });
    } catch (error) {
        console.error('GET Backup Download Error:', error);
        return NextResponse.json({ error: '파일을 다운로드할 수 없습니다.' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ filename: string }> }) {
    try {
        const { filename } = await params;
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'OWNER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const safeFilename = path.basename(filename);
        const filePath = path.join(BACKUP_DIR, safeFilename);

        await unlink(filePath);

        return NextResponse.json({ message: '백업 파일이 삭제되었습니다.' });
    } catch (error) {
        console.error('DELETE Backup Error:', error);
        return NextResponse.json({ error: '파일 삭제에 실패했습니다.' }, { status: 500 });
    }
}
