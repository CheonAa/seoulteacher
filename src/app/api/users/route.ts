import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "OWNER") {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                color: true,
                createdAt: true,
                // Omit password
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("GET Users Error:", error);
        return NextResponse.json({ error: "사용자 목록을 불러오는데 실패했습니다." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "OWNER") {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const { email, password, name, role, color } = await req.json();

        if (!email || !password || !name || !role) {
            return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "이미 존재하는 이메일입니다." }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUserData: any = {
            email,
            password: hashedPassword,
            name,
            role,
        };

        if (color) {
            newUserData.color = color;
        }

        const newUser = await prisma.user.create({
            data: newUserData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                color: true,
            }
        });

        // If the role is INSTRUCTOR, optionally create a blank InstructorProfile
        if (role === "INSTRUCTOR") {
            await prisma.instructorProfile.create({
                data: {
                    userId: newUser.id
                }
            });
        }

        return NextResponse.json({ message: "사용자가 성공적으로 생성되었습니다.", user: newUser }, { status: 201 });
    } catch (error) {
        console.error("POST User Error:", error);
        return NextResponse.json({ error: "사용자 생성에 실패했습니다." }, { status: 500 });
    }
}
