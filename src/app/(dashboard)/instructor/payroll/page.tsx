import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { CreditCard, DollarSign } from "lucide-react";
import InstructorPayrollTable from "./InstructorPayrollTable";
import { redirect } from "next/navigation";

export default async function InstructorPayrollPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    // Fetch the logged-in user to ensure they are an instructor and get their ID
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true, instructorProfile: true }
    });

    if (!user || user.role !== "INSTRUCTOR" || !user.instructorProfile) {
        redirect("/");
    }

    // Default to current year/month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Fetch all payrolls for the instructor
    const payrolls = await prisma.payroll.findMany({
        where: {
            instructorProfileId: user.instructorProfile.id,
        },
        orderBy: [
            { year: 'desc' },
            { month: 'desc' }
        ]
    });

    const currentMonthPayroll = payrolls.find(p => p.year === currentYear && p.month === currentMonth);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    내 급여 명세서
                </h1>
                <div className="bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200 text-sm font-medium text-slate-700">
                    기준: {currentYear}년 {currentMonth}월
                </div>
            </div>

            {currentMonthPayroll ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center space-x-4">
                        <div className="p-3 bg-blue-50 rounded-full">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">이번 달 베트남 지급액 (VND)</p>
                            <p className="text-2xl font-bold text-slate-900">{currentMonthPayroll.remainingVND.toLocaleString()} ₫</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {(user.instructorProfile.baseRate * 100).toFixed(0)}% 반영됨
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center space-x-4">
                        <div className="p-3 bg-green-50 rounded-full">
                            <CreditCard className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">이번 달 한국 실지급액 (KRW)</p>
                            <p className="text-2xl font-bold text-slate-900">{currentMonthPayroll.netPaidKRW.toLocaleString()} ₩</p>
                            <p className="text-xs text-slate-400 mt-1">
                                환율: {currentMonthPayroll.exchangeRate} 적용
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 flex items-center justify-center text-slate-500">
                    이번 달({currentMonth}월) 등록된 정산 내역이 없습니다. (월말 정산 전일 수 있습니다)
                </div>
            )}

            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
                    <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        월별 급여 정산 일람
                    </h3>
                </div>

                <InstructorPayrollTable initialPayrolls={payrolls} />
            </div>
        </div>
    );
}
