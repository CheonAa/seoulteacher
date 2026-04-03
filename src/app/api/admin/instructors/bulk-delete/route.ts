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

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "삭제할 강사 ID가 누락되었습니다." }, { status: 400 });
        }

        const targetInstructors = await prisma.user.findMany({
            where: { id: { in: ids } },
            select: { 
                id: true, 
                name: true, 
                creatorId: true,
                _count: {
                    select: { enrollments: true }
                }
            }
        });

        if (targetInstructors.length === 0) {
            return NextResponse.json({ error: '해당 강사들을 찾을 수 없습니다.' }, { status: 404 });
        }

        const failedNames: string[] = [];
        const successIds: string[] = [];

        for (const instructor of targetInstructors) {
            // Authorization Check
            if (role !== 'OWNER' && instructor.creatorId !== currentUser?.id) {
                failedNames.push(`${instructor.name} (권한 없음)`);
                continue;
            }

            // Enrollment Check
            if (instructor._count.enrollments > 0) {
                failedNames.push(`${instructor.name} (수강생 ${instructor._count.enrollments}명 존재)`);
                continue;
            }

            successIds.push(instructor.id);
        }

        if (successIds.length > 0) {
            // Safe to delete these
            await prisma.user.deleteMany({
                where: { id: { in: successIds } }
            });
        }

        const successMessage = successIds.length > 0 ? `${successIds.length}명의 강사가 삭제되었습니다.` : '';
        const failedMessage = failedNames.length > 0 ? `다음 강사는 삭제할 수 없습니다: ${failedNames.join(', ')}` : '';

        return NextResponse.json({
            message: [successMessage, failedMessage].filter(Boolean).join('\n'),
            deletedCount: successIds.length,
            failedCount: failedNames.length
        });
        
    } catch (error) {
        console.error('POST Bulk Delete Instructors Error:', error);
        return NextResponse.json({ error: '강사 일괄 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
