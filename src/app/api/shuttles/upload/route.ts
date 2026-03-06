import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import * as xlsx from 'xlsx';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();

        // Read the workbook from the buffer
        const workbook = xlsx.read(Buffer.from(buffer), { type: 'buffer' });

        // Assume the first sheet is the one we want
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Parse to JSON WITH raw: false so we get the text string (e.g. "15:40") instead of Excel number fraction (e.g. 0.6527)
        const data: Record<string, unknown>[] = xlsx.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "HH:mm" });

        if (!data || data.length === 0) {
            return NextResponse.json({ error: '데이터가 없습니다.' }, { status: 400 });
        }

        // Validate headers loosely to ensure it's the right format
        const expectedHeaders = ["요일", "차량명", "회차", "구분", "시간", "장소", "학생명"];
        const firstRow = data[0];

        for (const header of expectedHeaders) {
            if (!(header in firstRow)) {
                return NextResponse.json({ error: `필수 열이 누락되었습니다: ${header}` }, { status: 400 });
            }
        }

        // Fetch instructors for name -> ID mapping
        const instructors = await prisma.user.findMany({
            where: { role: 'INSTRUCTOR' },
            select: { id: true, name: true, color: true }
        });

        const formattedData = data.map((row: Record<string, unknown>, index: number) => {
            const rowNumber = index + 2; // Excel row number (1-indexed + header)
            const inputInstructor = row["강사명"] ? String(row["강사명"]).trim() : (row["강사ID"] ? String(row["강사ID"]).trim() : null);
            let insId = null;
            let insColor = row["색상"] ? String(row["색상"]).trim() : null;

            if (inputInstructor) {
                const inst = instructors.find(i => i.name === inputInstructor || i.id === inputInstructor);
                if (inst) {
                    insId = inst.id;
                    if (!insColor && inst.color) insColor = inst.color;
                } else {
                    throw new Error(`${rowNumber}번째 줄: 강사 '${inputInstructor}'을(를) 시스템에서 찾을 수 없습니다. 등록된 강사명과 정확히 일치하는지 확인하세요.`);
                }
            }

            return {
                dayOfWeek: String(row["요일"]).toUpperCase().trim(),
                vehicleName: String(row["차량명"]).trim(),
                roundIndex: parseInt(String(row["회차"])) || 1,
                runType: String(row["구분"]).toUpperCase().trim() === 'PICKUP' ? 'PICKUP' : 'DROPOFF',
                time: String(row["시간"]).trim(),
                locationName: String(row["장소"]).trim(),
                students: row["학생명"] ? String(row["학생명"]).trim() : null,
                instructorId: insId,
                color: insColor || "#e2e8f0"
            };
        });

        // Wiping all existing data and replacing it entirely ensures the Excel file is the master truth.
        // We do this in a transaction.
        await prisma.$transaction(async (tx) => {
            // 1. Wipe everything
            await tx.shuttleSchedule.deleteMany();

            // 2. Insert new from Excel
            if (formattedData.length > 0) {
                await tx.shuttleSchedule.createMany({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data: formattedData as any, // Cast due to strict prisma typing vs mapped
                });
            }
        });

        return NextResponse.json({ message: `${formattedData.length}건의 일정이 업로드되었습니다.` });

    } catch (error) {
        console.error('Excel Upload parsing error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `파일 처리 중 오류가 발생했습니다.\n상세 사유: ${errorMessage}` }, { status: 500 });
    }
}
