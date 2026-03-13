import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: { id: string, consultationId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { consultationId } = params;
        
        // We might want to check if the user is OWNER or the creator of the consultation to allow delete
        const consultation = await prisma.consultation.findUnique({
            where: { id: consultationId }
        });

        if (!consultation) {
            return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
        }

        if (session.user.role !== 'OWNER' && consultation.creatorId !== session.user.id) {
             return NextResponse.json({ error: "Forbidden: You cannot delete someone else's consultation log unless you are an OWNER." }, { status: 403 });
        }

        await prisma.consultation.delete({
            where: { id: consultationId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to delete consultation:", error);
        return NextResponse.json({ error: "Failed to delete consultation." }, { status: 500 });
    }
}
