import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "OWNER") {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "삭제할 사용자 ID가 누락되었습니다." }, { status: 400 });
        }

        const ownerId = session.user.id;

        // 본인 계정은 삭제 대상에서 제외
        const idsToDelete = ids.filter(id => id !== ownerId);

        if (idsToDelete.length === 0) {
            return NextResponse.json({ error: "유효한 삭제 대상이 없습니다 (자신의 계정은 삭제할 수 없습니다)." }, { status: 400 });
        }

        // 1. Reassign Enrollments
        await prisma.enrollment.updateMany({
            where: { instructorId: { in: idsToDelete } },
            data: { instructorId: ownerId }
        });

        // 2. Reassign ShuttleSchedules
        await prisma.shuttleSchedule.updateMany({
            where: { instructorId: { in: idsToDelete } },
            data: { instructorId: ownerId }
        });

        // 3. Reassign Notices
        await prisma.notice.updateMany({
            where: { authorId: { in: idsToDelete } },
            data: { authorId: ownerId }
        });

        // 4. Reassign creatorId for Students, Attendances, Users
        await prisma.student.updateMany({
            where: { creatorId: { in: idsToDelete } },
            data: { creatorId: ownerId }
        });
        await prisma.attendance.updateMany({
            where: { creatorId: { in: idsToDelete } },
            data: { creatorId: ownerId }
        });
        await prisma.user.updateMany({
            where: { creatorId: { in: idsToDelete } },
            data: { creatorId: ownerId }
        });

        // Now safe to delete
        await prisma.user.deleteMany({
            where: { id: { in: idsToDelete } },
        });

        return NextResponse.json({ 
            message: `${idsToDelete.length}명의 데이터가 원장님께 인계된 후 삭제되었습니다.`,
            deletedCount: idsToDelete.length
        }, { status: 200 });
    } catch (error: any) {
        console.error("POST Bulk Delete Users Error:", error);
        return NextResponse.json({ error: "사용자 일괄 삭제에 실패했습니다." }, { status: 500 });
    }
}
