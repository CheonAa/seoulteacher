import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const dayOfWeek = searchParams.get('dayOfWeek');
        const vehicleName = searchParams.get('vehicleName');

        const where: any = {};
        if (dayOfWeek) where.dayOfWeek = dayOfWeek;
        if (vehicleName) where.vehicleName = vehicleName;

        const schedules = await prisma.shuttleSchedule.findMany({
            where,
            include: {
                instructor: {
                    select: {
                        name: true,
                        color: true,
                    }
                }
            },
            orderBy: [
                { roundIndex: 'asc' },
                { time: 'asc' },
            ],
        });

        // Group the data by schedule blocks logically for the frontend, or just return flat
        return NextResponse.json(schedules);
    } catch (error) {
        console.error('Shuttle GET Error:', error);
        return NextResponse.json({ error: '데이터를 불러오는데 실패했습니다.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        const body = await req.json();
        // The frontend will send the full updated list for a specific day and vehicle
        const { dayOfWeek, vehicleName, schedules } = body;

        if (!dayOfWeek || !vehicleName || !Array.isArray(schedules)) {
            return NextResponse.json({ error: '잘못된 데이터 형식입니다.' }, { status: 400 });
        }

        // Use a transaction to delete existing for that day/vehicle and insert the new ones
        await prisma.$transaction(async (tx) => {
            await tx.shuttleSchedule.deleteMany({
                where: {
                    dayOfWeek,
                    vehicleName,
                },
            });

            if (schedules.length > 0) {
                // Ensure instructorId is mapped correctly (or null)
                const createData = schedules.map((s: any) => ({
                    vehicleName: s.vehicleName || vehicleName,
                    dayOfWeek: s.dayOfWeek || dayOfWeek,
                    roundIndex: s.roundIndex,
                    runType: s.runType,
                    time: s.time,
                    locationName: s.locationName,
                    students: s.students || null,
                    instructorId: s.instructorId || null,
                    color: s.color || null,
                }));

                await tx.shuttleSchedule.createMany({
                    data: createData,
                });
            }
        });

        return NextResponse.json({ message: '저장되었습니다.' });
    } catch (error) {
        console.error('Shuttle POST Error:', error);
        return NextResponse.json({ error: '저장하는데 실패했습니다.' }, { status: 500 });
    }
}
