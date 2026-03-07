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
            <AttendanceRoster attendances={attendances as any} role="INSTRUCTOR" currentUserId={user.id} />
        </div>
    );
}
