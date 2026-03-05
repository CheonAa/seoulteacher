import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const settings = await prisma.systemSettings.findMany();

        // Convert array of {key, value} to a dictionary object
        const settingsMap = settings.reduce((acc, current) => {
            acc[current.key] = current.value;
            return acc;
        }, {} as Record<string, string>);

        return NextResponse.json(settingsMap);
    } catch (error) {
        console.error("GET Settings Error:", error);
        return NextResponse.json({ error: "설정을 불러오는데 실패했습니다." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "OWNER") {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        const body = await req.json();

        // Create or Update all provided settings
        // body is expected to be a dictionary Record<string, string>
        const updates = Object.entries(body).map(async ([key, value]) => {
            return prisma.systemSettings.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) },
            });
        });

        await Promise.all(updates);

        return NextResponse.json({ message: "성공적으로 저장되었습니다." });
    } catch (error) {
        console.error("POST Settings Error:", error);
        return NextResponse.json({ error: "설정 저장에 실패했습니다." }, { status: 500 });
    }
}
