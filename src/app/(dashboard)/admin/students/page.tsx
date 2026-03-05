import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Users, Search } from "lucide-react";
import StudentTable from "./StudentTable";
import Link from "next/link";

export default async function AdminStudentsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    const role = session.user.role;
    let studentWhereClause = {};

    if (role === 'INSTRUCTOR') {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });
        if (user) {
            studentWhereClause = {
                enrollments: {
                    some: {
                        instructorId: user.id
                    }
                }
            };
        }
    }

    // Fetch students with their enrollments and instructor
    const students = await prisma.student.findMany({
        where: studentWhereClause,
        include: {
            enrollments: {
                include: {
                    instructor: {
                        select: { name: true }
                    }
                }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    학생 관리
                </h1>
                <Link
                    href="/admin/students/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    신규 학생 등록
                </Link>
            </div>

            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        총 학생 현황 ({students.length}명)
                    </h3>
                </div>

                <StudentTable initialStudents={students} />
            </div>
        </div>
    );
}
