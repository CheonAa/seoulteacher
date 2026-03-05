import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import BillingTable from "./BillingTable"; // 클라이언트 컴포넌트로 분리

export default async function BillingPage() {
    const session = await getServerSession(authOptions);

    const billings = await prisma.monthlyBilling.findMany({
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
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    수강료 납부 관리
                </h1>
            </div>

            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">전체 청구 내역</h3>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">학생들의 당월 / 이월 청구 내역을 관리합니다.</p>
                </div>

                {/* Client Component for Interactive Table */}
                <BillingTable billings={billings} />
            </div>
        </div>
    );
}
