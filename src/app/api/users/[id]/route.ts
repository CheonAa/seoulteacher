import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "OWNER") {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const { id } = await params;
        const { email, password, name, role, color } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "사용자 ID가 누락되었습니다." }, { status: 400 });
        }

        // Prepare update data
        const updateData: any = {};
        if (email) updateData.email = email;
        if (name) updateData.name = name;
        if (role) updateData.role = role;
        if (color !== undefined) updateData.color = color;

        // Hash password if provided (for password resets/changes)
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                color: true,
            }
        });

        if (updateData.role === "INSTRUCTOR") {
            const profile = await prisma.instructorProfile.findUnique({ where: { userId: id } });
            if (!profile) {
                await prisma.instructorProfile.create({ data: { userId: id } });
            }
        }

        return NextResponse.json({ message: "사용자 정보가 업데이트되었습니다.", user: updatedUser }, { status: 200 });
    } catch (error) {
        console.error("PUT User Error:", error);
        return NextResponse.json({ error: "사용자 정보 업데이트에 실패했습니다." }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "OWNER") {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "사용자 ID가 누락되었습니다." }, { status: 400 });
        }

        if (session.user.id === id) {
            return NextResponse.json({ error: "자신의 계정은 삭제할 수 없습니다." }, { status: 400 });
        }

        const ownerId = session.user.id;

        await prisma.$transaction(async (tx) => {
            // 1. Reassign Enrollments
            await tx.enrollment.updateMany({
                where: { instructorId: id },
                data: { instructorId: ownerId }
            });

            // 2. Reassign ShuttleSchedules
            await tx.shuttleSchedule.updateMany({
                where: { instructorId: id },
                data: { instructorId: ownerId }
            });

            // 3. Reassign Notices
            await tx.notice.updateMany({
                where: { authorId: id },
                data: { authorId: ownerId }
            });

            // 4. Reassign creatorId for Students, Attendances, Users
            await tx.student.updateMany({
                where: { creatorId: id },
                data: { creatorId: ownerId }
            });
            await tx.attendance.updateMany({
                where: { creatorId: id },
                data: { creatorId: ownerId }
            });
            await tx.user.updateMany({
                where: { creatorId: id },
                data: { creatorId: ownerId }
            });

            // Now safe to delete
            await tx.user.delete({
                where: { id },
            });
        });

        return NextResponse.json({ message: "사용자의 데이터가 원장님께 인계된 후 삭제되었습니다." }, { status: 200 });
    } catch (error: any) {
        console.error("DELETE User Error:", error);
        return NextResponse.json({ error: "사용자 삭제에 실패했습니다." }, { status: 500 });
    }
}
