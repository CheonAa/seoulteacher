import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import AttendanceRoster from "@/components/AttendanceRoster";
import AttendanceHeadcount from "@/components/AttendanceHeadcount";
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
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Fetch billing for these enrollments to calc remaining sessions
    // BUG FIX: We need the *latest* billing record for each enrollment, not just the current month's, 
    // because if they didn't attend this month yet, the current month billing might not exist or be accurate for their carryover.
    const enrollmentIds = [...new Set(attendances.map(a => a.enrollmentId))];
    
    // Fallback: Fetch all billings for these enrollments and keep the latest one per enrollment
    const allBillings = await prisma.monthlyBilling.findMany({
        where: {
            enrollmentId: { in: enrollmentIds }
        },
        orderBy: [
            { year: 'desc' },
            { month: 'desc' }
        ]
    });

    // Deduplicate to only keep the most recent billing per enrollment
    const latestBillingsMap = new Map();
    for (const b of allBillings) {
        if (!latestBillingsMap.has(b.enrollmentId)) {
            latestBillingsMap.set(b.enrollmentId, b);
        }
    }

    const attendancesWithRemaining = attendances.map(att => {
        const billing = latestBillingsMap.get(att.enrollmentId);
        let remainingSessions = 999; // Default if no billing found yet
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
                    출결 대시보드
                </h1>
                <Link
                    href="/admin/attendance/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    수동 출결 및 결석 등록
                </Link>
            </div>

            <AttendanceHeadcount attendances={attendances as any} role="ADMIN" />
            <AttendanceRoster attendances={attendancesWithRemaining as any} role="ADMIN" currentUserId={session.user.id} />
        </div>
    );
}
