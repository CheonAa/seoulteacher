import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const studentId = params.id;
        const consultations = await prisma.consultation.findMany({
            where: { studentId },
            orderBy: { date: 'desc' },
        });

        // Get creator names
        const creatorIds: string[] = Array.from(new Set(consultations.map((c: any) => c.creatorId as string)));
        const creators = await prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, name: true }
        });
        const creatorMap = new Map(creators.map(c => [c.id, c.name]));

        const resData = consultations.map((c: any) => ({
            ...c,
            creatorName: creatorMap.get(c.creatorId as string) || 'Unknown'
        }));

        return NextResponse.json({ consultations: resData });
    } catch (error: any) {
        console.error("Failed to fetch consultations:", error);
        return NextResponse.json({ error: "Failed to fetch consultations." }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const studentId = params.id;
        const { date, content } = await request.json();

        if (!date || !content) {
            return NextResponse.json({ error: "Date and content are required" }, { status: 400 });
        }

        const consultation = await prisma.consultation.create({
            data: {
                studentId,
                date: new Date(date),
                content,
                creatorId: session.user.id
            }
        });

        return NextResponse.json({ consultation });
    } catch (error: any) {
        console.error("Failed to create consultation:", error);
        return NextResponse.json({ error: "Failed to create consultation." }, { status: 500 });
    }
}
