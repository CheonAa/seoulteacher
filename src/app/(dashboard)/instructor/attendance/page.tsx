import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import AttendanceRoster from "@/components/AttendanceRoster";
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
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Fetch billing for these enrollments to calc remaining sessions
    const enrollmentIds = [...new Set(attendances.map(a => a.enrollmentId))];
    const billings = await prisma.monthlyBilling.findMany({
        where: {
            enrollmentId: { in: enrollmentIds },
            year: currentYear,
            month: currentMonth
        }
    });

    const attendancesWithRemaining = attendances.map(att => {
        const billing = billings.find(b => b.enrollmentId === att.enrollmentId);
        let remainingSessions = 999;
        let attendedSessions = 0;
        let targetSessions = 0;

        if (billing) {
            remainingSessions = billing.carryOverSessions;
            attendedSessions = billing.attendedSessions;
            targetSessions = billing.carryOverSessions + billing.attendedSessions;
        }

        return {
            ...att,
            enrollment: {
                ...att.enrollment,
                remainingSessions,
                attendedSessions,
                targetSessions
            }
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
            <AttendanceRoster attendances={attendancesWithRemaining as any} role="INSTRUCTOR" currentUserId={user.id} />
        </div>
    );
}
