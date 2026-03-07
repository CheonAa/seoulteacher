import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { CalendarCheck } from "lucide-react";
import InstructorAttendanceTable from "./InstructorAttendanceTable";
import AttendanceHeadcount from "@/components/AttendanceHeadcount";
import { redirect } from "next/navigation";

export default async function InstructorAttendancePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    // Fetch the logged-in user to ensure they are an instructor and get their ID
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true }
    });

    if (!user || user.role !== "INSTRUCTOR") {
        redirect("/");
    }

    // Fetch all attendances for enrollments associated with this instructor
    const attendances = await prisma.attendance.findMany({
        where: {
            enrollment: {
                instructorId: user.id
            }
        },
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
                    내 수업/출결 내역
                </h1>
            </div>

            <AttendanceHeadcount attendances={attendances as any} role="INSTRUCTOR" />

            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-blue-600" />
                        내 담당 수업 전체 출결 기록 ({attendances.length}건)
                    </h3>
                </div>

                <InstructorAttendanceTable initialAttendances={attendances} />
            </div>
        </div>
    );
}
