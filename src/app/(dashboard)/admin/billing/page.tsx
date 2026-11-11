import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import BillingClientTabs from "./BillingClientTabs";

export default async function BillingPage() {
    const session = await getServerSession(authOptions);

    const [billings, rawDeposits, instructors, students] = await Promise.all([
        prisma.monthlyBilling.findMany({
            include: {
                enrollment: {
                    include: {
                        student: true,
                        instructor: true
                    }
                }
            },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' },
                { isPaid: 'asc' }
            ]
        }),
        prisma.depositRecord.findMany({
            include: {
                instructor: { select: { id: true, name: true } },
                student: { select: { id: true, name: true } }
            },
            orderBy: [
                { depositDate: 'desc' },
                { createdAt: 'desc' }
            ]
        }),
        prisma.user.findMany({
            where: { role: 'INSTRUCTOR' },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
        prisma.student.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })
    ]);

    const deposits = rawDeposits.map((d) => ({
        id: d.id,
        depositDate: d.depositDate.toISOString(),
        amount: d.amount,
        description: d.description,
        matchedStudentName: d.matchedStudentName,
        studentId: d.studentId,
        instructorId: d.instructorId,
        reconciliationStatus: d.reconciliationStatus,
        instructor: d.instructor,
        student: d.student
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    수강료 납부 관리
                </h1>
            </div>

            <BillingClientTabs
                deposits={deposits}
                billings={billings}
                instructors={instructors}
                students={students}
                role={session?.user?.role || ''}
            />
        </div>
    );
}
