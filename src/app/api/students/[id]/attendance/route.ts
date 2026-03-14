import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');
        const monthParam = searchParams.get('month');

        // Allow filtering by month if provided, otherwise fetch all (or a wide range)
        let dateFilter = {};
        if (yearParam && monthParam) {
            const year = parseInt(yearParam);
            const month = parseInt(monthParam);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);

            dateFilter = {
                date: {
                    gte: startDate,
                    lte: endDate,
                }
            };
        }

        const attendances = await prisma.attendance.findMany({
            where: {
                enrollment: {
                    studentId: id
                },
                ...dateFilter
            },
            include: {
                enrollment: {
                    select: {
                        subjectName: true,
                        instructor: { select: { name: true } }
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        // For INSTRUCTOR role, ensure they only see attendances for their own subjects
        // unless they are also the creator of the student, but typically instructors shouldn't see other classes.
        // Wait, the admin dashboard shows all. Let's filter if the user is an instructor.
        let filteredAttendances = attendances;
        if (session.user.role === 'INSTRUCTOR') {
            const currentUser = await prisma.user.findUnique({
                where: { email: session.user.email as string },
                select: { id: true, name: true }
            });
            const student = await prisma.student.findUnique({ where: { id } });

            if (currentUser && student?.creatorId !== currentUser.id) {
                // Not the creator, only show their own classes
                filteredAttendances = attendances.filter(a => a.enrollment.instructor.name === currentUser.name);
            }
        }

        return NextResponse.json(filteredAttendances);
    } catch (error) {
        console.error('Error fetching student attendances:', error);
        return NextResponse.json(
            { error: 'Failed to fetch attendance data' },
            { status: 500 }
        );
    }
}
