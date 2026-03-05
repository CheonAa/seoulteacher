import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // 조회수 증가 및 데이터 조회 한 번에 처리
        const notice = await prisma.notice.update({
            where: { id },
            data: {
                views: { increment: 1 }
            },
            include: {
                author: {
                    select: {
                        name: true,
                        role: true
                    }
                },
                attachments: true
            }
        });

        return NextResponse.json(notice);
    } catch (error) {
        console.error("GET Notice detail Error:", error);
        return NextResponse.json({ error: "공지사항을 불러오지 못했습니다." }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
            return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const { title, content, isImportant, externalLink, attachments } = body;

        // Perform transaction to safely delete old attachments and insert new ones
        const updatedNotice = await prisma.$transaction(async (tx) => {
            // Unlink current attachments
            await tx.noticeAttachment.deleteMany({
                where: { noticeId: id }
            });

            // Update notice and add new attachments
            return tx.notice.update({
                where: { id },
                data: {
                    title,
                    content,
                    isImportant: Boolean(isImportant),
                    externalLink: externalLink || null,
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
        });

        return NextResponse.json(updatedNotice);
    } catch (error) {
        console.error("PUT Notice Error:", error);
        return NextResponse.json({ error: "공지사항 수정을 실패했습니다." }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
            return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
        }

        const { id } = await params;

        await prisma.notice.delete({
            where: { id }
        });

        return NextResponse.json({ message: "삭제되었습니다." });
    } catch (error) {
        console.error("DELETE Notice Error:", error);
        return NextResponse.json({ error: "공지사항 삭제를 실패했습니다." }, { status: 500 });
    }
}
