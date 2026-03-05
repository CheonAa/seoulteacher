import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const notices = await prisma.notice.findMany({
            skip,
            take: limit,
            orderBy: [
                { isImportant: 'desc' },
                { createdAt: 'desc' },
            ],
            include: {
                author: {
                    select: {
                        name: true,
                        role: true
                    }
                },
                attachments: true,
            }
        });

        const total = await prisma.notice.count();

        return NextResponse.json({
            notices,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        console.error("GET Notices Error:", error);
        return NextResponse.json({ error: "공지사항을 불러오지 못했습니다." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
            return NextResponse.json({ error: "작성 권한이 없습니다." }, { status: 403 });
        }

        const body = await req.json();
        const { title, content, isImportant, externalLink, attachments } = body;

        if (!title || !content) {
            return NextResponse.json({ error: "제목과 내용을 모두 입력해주세요." }, { status: 400 });
        }

        const newNotice = await prisma.notice.create({
            data: {
                title,
                content,
                isImportant: Boolean(isImportant),
                externalLink: externalLink || null,
                authorId: session.user.id,
                attachments: {
                    create: attachments?.map((file: any) => ({
                        name: file.name,
                        url: file.url
                    })) || []
                }
            },
            include: {
                attachments: true
            }
        });

        return NextResponse.json(newNotice, { status: 201 });
    } catch (error) {
        console.error("POST Notice Error:", error);
        return NextResponse.json({ error: "공지사항 작성을 실패했습니다." }, { status: 500 });
    }
}
