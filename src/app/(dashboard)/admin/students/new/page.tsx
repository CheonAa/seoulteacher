import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import StudentForm from "./StudentForm";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewStudentPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        redirect("/login");
    }

    const role = session.user.role as string;

    // Fetch instructors for the dropdown
    const instructorWhereClause: any = { role: 'INSTRUCTOR' };

    // 강사일 경우 본인만 선택 가능하도록 필터링
    if (role === 'INSTRUCTOR') {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });
        if (user) {
            instructorWhereClause.id = user.id;
        }
    }

    const instructors = await prisma.user.findMany({
        where: instructorWhereClause,
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-4">
                <Link href="/admin/students" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    신규 학생 및 수강 등록
                </h1>
            </div>

            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                <StudentForm instructors={instructors} />
            </div>
        </div>
    );
}
