import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import InstructorTable from "./InstructorTable";
import Link from "next/link";

export default async function AdminInstructorsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    const instructors = await prisma.user.findMany({
        where: {
            role: "INSTRUCTOR"
        },
        include: {
            instructorProfile: true,
            _count: {
                select: {
                    enrollments: true
                }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });

    const serializedInstructors = instructors.map(inst => ({
        id: inst.id,
        name: inst.name,
        email: inst.email,
        instructorProfile: inst.instructorProfile ? {
            baseRate: inst.instructorProfile.baseRate,
            insuranceFee: inst.instructorProfile.insuranceFee,
            bankAccountVND: inst.instructorProfile.bankAccountVND,
            bankAccountKRW: inst.instructorProfile.bankAccountKRW,
        } : null,
        _count: inst._count,
        creatorId: inst.creatorId
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    강사 관리
                </h1>
                <Link
                    href="/admin/instructors/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    신규 강사 등록
                </Link>
            </div>

            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        소속 강사 현황 ({instructors.length}명)
                    </h3>
                </div>

                <InstructorTable
                    initialInstructors={serializedInstructors}
                    currentUserId={session.user.id}
                    currentUserRole={session.user.role}
                />
            </div>
        </div>
    );
}
