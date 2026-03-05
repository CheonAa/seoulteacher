import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
            return NextResponse.json({ error: "업로드 권한이 없습니다." }, { status: 403 });
        }

        const formData = await req.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
        }

        if (files.length > 2) {
            return NextResponse.json({ error: "파일은 최대 2개까지만 업로드 가능합니다." }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public", "uploads", "notices");

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        const uploadedFiles = [];

        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Create a unique filename to prevent overwriting
            const uniqueFilename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = path.join(uploadDir, uniqueFilename);

            await writeFile(filePath, buffer);

            // Return relative URL for frontend consumption
            uploadedFiles.push({
                name: file.name,
                url: `/uploads/notices/${uniqueFilename}`
            });
        }

        return NextResponse.json({ files: uploadedFiles }, { status: 201 });
    } catch (error) {
        console.error("POST Upload Error:", error);
        return NextResponse.json({ error: "파일 업로드를 실패했습니다." }, { status: 500 });
    }
}
