import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { CreditCard, DollarSign } from "lucide-react";
import OwnerPayrollTable from "./OwnerPayrollTable";

export default async function OwnerPayrollPage() {
    const session = await getServerSession(authOptions);

    // Default to current year/month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Fetch all payrolls for the current month
    const payrolls = await prisma.payroll.findMany({
        where: {
            year: currentYear,
            month: currentMonth,
        },
        include: {
            instructorProfile: {
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            }
        },
        orderBy: {
            instructorProfile: {
                user: {
                    name: 'asc'
                }
            }
        }
    });

    const totalVND = payrolls.reduce((sum, p) => sum + p.remainingVND, 0);
    const totalKRW = payrolls.reduce((sum, p) => sum + p.netPaidKRW, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    전체 급여 정산
                </h1>
                <div className="bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200 text-sm font-medium text-slate-700">
                    {currentYear}년 {currentMonth}월 정산 내역
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 rounded-full">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">총 지급 예정액 (VND)</p>
                        <p className="text-2xl font-bold text-slate-900">{totalVND.toLocaleString()} VND</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div className="p-3 bg-green-50 rounded-full">
                        <CreditCard className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">총 지급 예정액 (KRW)</p>
                        <p className="text-2xl font-bold text-slate-900">{totalKRW.toLocaleString()} 원</p>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
                    <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        강사별 세부 정산 내역
                    </h3>
                </div>

                <OwnerPayrollTable initialPayrolls={payrolls} />
            </div>
        </div>
    );
}
