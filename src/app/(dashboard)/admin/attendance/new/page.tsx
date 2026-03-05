import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import AttendanceForm from "./AttendanceForm";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewAttendancePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        redirect("/login");
    }

    const role = session.user.role as string;
    let enrollmentWhereClause = {};

    if (role === 'INSTRUCTOR') {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });
        if (user) {
            enrollmentWhereClause = {
                instructorId: user.id
            };
        }
    }

    // Fetch enrollments with student and instructor details for the dropdown
    const enrollments = await prisma.enrollment.findMany({
        where: enrollmentWhereClause,
        include: {
            student: { select: { name: true } },
            instructor: { select: { name: true } }
        },
        orderBy: {
            student: { name: 'asc' }
        }
    });

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-4">
                <Link href="/admin/attendance" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    수동 출결 및 결석 등록
                </h1>
            </div>

            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                <AttendanceForm enrollments={enrollments} />
            </div>
        </div>
    );
}
