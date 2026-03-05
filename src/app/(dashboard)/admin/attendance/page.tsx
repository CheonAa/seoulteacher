import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { CalendarCheck, Search } from "lucide-react";
import AttendanceTable from "./AttendanceTable";
import Link from "next/link";

export default async function AdminAttendancePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    const role = session.user.role;
    let attendanceWhereClause = {};

    if (role === 'INSTRUCTOR') {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });
        if (user) {
            attendanceWhereClause = {
                enrollment: {
                    instructorId: user.id
                }
            };
        }
    }

    // Fetch all attendances with their enrollments, student and instructor
    const attendances = await prisma.attendance.findMany({
        where: attendanceWhereClause,
        include: {
            enrollment: {
                include: {
                    student: true,
                    instructor: true
                }
            }
        },
        orderBy: {
            date: 'desc'
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    출결 대시보드
                </h1>
                <Link
                    href="/admin/attendance/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    수동 출결 및 결석 등록
                </Link>
            </div>

            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-blue-600" />
                        전체 출결 기록 ({attendances.length}건)
                    </h3>
                </div>

                <AttendanceTable initialAttendances={attendances} />
            </div>
        </div>
    );
}
