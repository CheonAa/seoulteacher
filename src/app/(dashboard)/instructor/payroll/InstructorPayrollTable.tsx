"use client";

import { CreditCard } from "lucide-react";

type PayrollData = {
    id: string;
    year: number;
    month: number;
    totalTuitionVND: number;
    insuranceDeduction: number;
    tax35Deduction: number;
    remainingVND: number;
    exchangeRate: number;
    transferFee: number;
    finalKRW: number;
    tax33Deduction: number;
    netPaidKRW: number;
};

export default function InstructorPayrollTable({ initialPayrolls }: { initialPayrolls: PayrollData[] }) {
    return (
        <div className="flex flex-col w-full">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">정산 월</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">총수업료 (VND)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">각종 공제 (VND)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">베트남 지급액 (VND)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">환산 적용 정보</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">한국 실지급액 (KRW)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {initialPayrolls.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    지급된 급여 정산 내역이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            initialPayrolls.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-slate-900">{p.year}년 {p.month}월</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                                        {p.totalTuitionVND.toLocaleString()} ₫
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 space-y-1">
                                        <div className="flex justify-between w-32">
                                            <span>보험료:</span>
                                            <span className="text-red-600">-{p.insuranceDeduction.toLocaleString()} ₫</span>
                                        </div>
                                        <div className="flex justify-between w-32">
                                            <span>3.5% 세금:</span>
                                            <span className="text-red-600">-{p.tax35Deduction.toLocaleString()} ₫</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-blue-600">{p.remainingVND.toLocaleString()} ₫</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 space-y-1">
                                        <div className="flex justify-between w-36">
                                            <span>적용 환율:</span>
                                            <span>{p.exchangeRate}</span>
                                        </div>
                                        <div className="flex justify-between w-36">
                                            <span>송금 수수료:</span>
                                            <span className="text-red-600">-{p.transferFee.toLocaleString()} ₩</span>
                                        </div>
                                        <div className="flex justify-between w-36">
                                            <span>한국세금 3.3%:</span>
                                            <span className="text-red-600">-{p.tax33Deduction.toLocaleString()} ₩</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-base font-bold text-green-600">{p.netPaidKRW.toLocaleString()} 원</div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
