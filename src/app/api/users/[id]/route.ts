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

        // Handle Role changes if necessary (e.g. creating/deleting InstructorProfile)
        // This is a simple implementation. In a complex app, you'd want to handle relationships carefully.
        if (updateData.role === "INSTRUCTOR") {
            // Check if profile exists, if not, create it
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

        // Prevent owner from deleting themselves (assuming owner logic or specific ID)
        if (session.user.id === id) {
            return NextResponse.json({ error: "자신의 계정은 삭제할 수 없습니다." }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ message: "사용자가 삭제되었습니다." }, { status: 200 });
    } catch (error: any) {
        console.error("DELETE User Error:", error);
        
        // Handle foreign key constraint violations
        if (error.code === 'P2003') {
             return NextResponse.json({ error: "해당 사용자가 담당 중인 수강 정보나 차량 스케줄 등 연결된 데이터가 있어 삭제할 수 없습니다." }, { status: 400 });
        }
        
        return NextResponse.json({ error: "사용자 삭제에 실패했습니다." }, { status: 500 });
    }
}
