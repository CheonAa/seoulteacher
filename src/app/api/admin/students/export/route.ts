import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        const body = await req.json();
        const { ids } = body;

        // ids가 전달되지 않은 경우 에러 방지
        let whereClause: any = {};
        if (ids && Array.isArray(ids) && ids.length > 0) {
            whereClause.id = { in: ids };
        } else if (ids && Array.isArray(ids) && ids.length === 0) {
            return NextResponse.json([]); // 빈 배열 반환
        }

        // INSTRUCTOR 인 경우 본인이 생성한 학생이거나 본인이 담당중인 학생만 조회 가능하도록 권한 필터 추가
        if (role === 'INSTRUCTOR') {
            whereClause = {
                ...whereClause,
                OR: [
                    { creatorId: currentUser?.id },
                    {
                        enrollments: {
                            some: { instructorId: currentUser?.id }
                        }
                    }
                ]
            };
        }

        const detailedStudents = await prisma.student.findMany({
            where: whereClause,
            include: {
                parents: true,
                enrollments: {
                    include: {
                        instructor: {
                            select: { name: true, email: true }
                        }
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(detailedStudents);
    } catch (error) {
        console.error('POST Export Students Error:', error);
        return NextResponse.json({ error: '상세 정보 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
