"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Wallet, CalendarDays, RefreshCw, AlertCircle } from "lucide-react";
import InstructorPayrollChart from "@/components/dashboard/InstructorPayrollChart";

type PayrollData = {
    instructorProfileId: string;
    userId: string;
    name: string;
    
    totalTuitionVND: number;
    insuranceDeduction: number;
    netVietnamSalary: number; 
    exchangeRate: number;
    transferFee: number;
    
    grossVietnamSalary: number;
    tax35Deduction: number;
    remainingVND: number;
    exchangedKRW: number;
    preTaxKRW: number;
    tax33Deduction: number;
    netPaidKRW: number;

    isSaved: boolean;
};

export default function InstructorPayrollPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [year, setYear] = useState(new Date().getFullYear());
    // Default to previous month if today is before the 5th, else current month
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    
    const [payroll, setPayroll] = useState<PayrollData | null>(null);

    const fetchPayroll = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/payroll?year=${year}&month=${month}`);
            if (!res.ok) throw new Error("급여 데이터를 불러오는데 실패했습니다.");
            const data = await res.json();
            
            // Should be an array with 1 item for the instructor
            const myPayroll = data.payrolls[0];
            
            // Only show to instructor if the owner has finalized and saved it.
            if (myPayroll && myPayroll.isSaved) {
                setPayroll(myPayroll);
            } else {
                setPayroll(null);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayroll();
    }, [year, month]);

    const formatVND = (num: number) => new Intl.NumberFormat('ko-KR').format(num) + ' VND';
    const formatKRW = (num: number) => new Intl.NumberFormat('ko-KR').format(num) + ' KRW';

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-blue-600" />
                        나의 급여 명세서
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">월별로 원장님이 정산 완료한 급여 내역을 확인합니다.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <select 
                        value={year} 
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="text-slate-900 bg-white border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}년</option>
                        ))}
                    </select>
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="text-slate-900 bg-white border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{m}월</option>
                        ))}
                    </select>
                    <button 
                        onClick={fetchPayroll}
                        className="p-2 bg-white border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 shadow-sm"
                        title="새로고침"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center text-slate-500 bg-white shadow-sm border border-slate-200 rounded-lg">
                    급여 정보를 확인하는 중입니다...
                </div>
            ) : !payroll ? (
                <div className="p-10 text-center bg-white shadow-sm border border-slate-200 rounded-lg flex flex-col items-center">
                    <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">아직 정산되지 않았습니다.</h3>
                    <p className="text-slate-500 mt-1">해당 월의 급여 정산이 완료되지 않았거나 내역이 없습니다.</p>
                </div>
            ) : (
                <div className="bg-white shadow-lg border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-blue-900 text-white p-6 sm:p-8 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold">{year}년 {month}월 급여 명세서</h2>
                            <p className="text-blue-200 mt-1">{session?.user?.name} 강사님</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-blue-200 mb-1">최종 지급액 (세후)</p>
                            <p className="text-3xl font-black text-emerald-400">{formatKRW(payroll.netPaidKRW)}</p>
                        </div>
                    </div>
                    
                    <div className="p-6 sm:p-8 space-y-8">
                        <InstructorPayrollChart payroll={payroll} />

                        {/* 베트남 급여 섹션 */}
                        <section>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4 border-b border-slate-200 pb-2">
                                <span className="w-2 h-6 bg-blue-500 rounded-full mr-2"></span>
                                베트남 급여 계산 (VND)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">총 수업료 (수강료×비율)</span>
                                        <span className="font-semibold text-slate-900">{formatVND(payroll.totalTuitionVND)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">보험료 공제</span>
                                        <span className="font-semibold text-red-500">-{formatVND(payroll.insuranceDeduction)}</span>
                                    </div>
                                </div>
                                <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">베트남 실수령액</span>
                                        <span className="font-semibold text-slate-900">{formatVND(payroll.netVietnamSalary)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">세전 총액 (3.5% 역계산)</span>
                                        <span className="text-slate-500">{formatVND(payroll.grossVietnamSalary)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                                        <span className="font-semibold text-blue-700">잔여 급여 (송금 대상)</span>
                                        <span className="font-bold text-blue-700">{formatVND(payroll.remainingVND)}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 한국 급여 섹션 */}
                        <section>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4 border-b border-slate-200 pb-2">
                                <span className="w-2 h-6 bg-emerald-500 rounded-full mr-2"></span>
                                한국 급여 계산 (KRW)
                            </h3>
                            <div className="bg-emerald-50/50 p-5 rounded-lg border border-emerald-100 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b border-emerald-200/50 pb-4">
                                    <div className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm">
                                        <span className="text-slate-600 flex items-center">
                                            적용 환율
                                            <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">70% 우대</span>
                                        </span>
                                        <span className="font-bold text-slate-900">{payroll.exchangeRate.toFixed(3)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm">
                                        <span className="text-slate-600">환전 원화 (잔여 / 환율)</span>
                                        <span className="font-bold text-slate-900">{formatKRW(payroll.exchangedKRW)}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 px-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">송금 수수료</span>
                                        <span className="font-medium text-red-500">-{formatKRW(payroll.transferFee)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">한국 급여 세전 (3.3% 공제 전)</span>
                                        <span className="font-medium text-slate-900">{formatKRW(payroll.preTaxKRW)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">3.3% 세금 공제액</span>
                                        <span className="font-medium text-red-500">-{formatKRW(payroll.tax33Deduction)}</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                        
                        <div className="bg-slate-100 text-slate-500 text-xs p-4 rounded-md text-center">
                            본 명세서는 내부 정산 내역을 보여주기 위한 화면이며, 실제 계좌 이체 시기와 하루 이틀 정도의 차이가 있을 수 있습니다. 의문 사항이 있으시면 원장님께 문의해주세요.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
