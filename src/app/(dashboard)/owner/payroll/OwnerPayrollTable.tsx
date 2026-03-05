"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type PayrollData = {
    id: string;
    totalTuitionVND: number;
    insuranceDeduction: number;
    tax35Deduction: number;
    remainingVND: number;
    exchangeRate: number;
    transferFee: number;
    finalKRW: number;
    tax33Deduction: number;
    netPaidKRW: number;
    instructorProfile: {
        user: { name: string; email: string };
        baseRate: number;
        bankAccountVND: string | null;
        bankAccountKRW: string | null;
    };
};

export default function OwnerPayrollTable({ initialPayrolls }: { initialPayrolls: PayrollData[] }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredPayrolls = initialPayrolls.filter(p =>
        p.instructorProfile.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col w-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="강사 이름으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">강사명 (계약 비율)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">총수업료 (VND)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">각종 공제 (VND)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">베트남 지급액 (VND)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">환산 적용 정보</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">한국 실지급액 (KRW)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredPayrolls.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    {searchTerm ? '검색 결과가 없습니다.' : '이번 달 정산 내역이 없습니다.'}
                                </td>
                            </tr>
                        ) : (
                            filteredPayrolls.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-slate-900">{p.instructorProfile.user.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {(p.instructorProfile.baseRate * 100).toFixed(0)}% 반영됨
                                        </div>
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
                                        {p.instructorProfile.bankAccountVND && (
                                            <div className="text-xs text-slate-400 mt-1">{p.instructorProfile.bankAccountVND}</div>
                                        )}
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
                                        {p.instructorProfile.bankAccountKRW && (
                                            <div className="text-xs text-slate-400 mt-1">{p.instructorProfile.bankAccountKRW}</div>
                                        )}
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
