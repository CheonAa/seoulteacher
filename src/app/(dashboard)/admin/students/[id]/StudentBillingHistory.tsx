'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { markAsPaid } from '@/app/(dashboard)/admin/actions'; // Assuming actions is here, but wait, it's actually in admin/actions.ts or admin/billing/actions.ts? Let's verify path later.

export default function StudentBillingHistory({ billings }: { billings: any[] }) {
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const [isExpanded, setIsExpanded] = useState(false);

    const handleMarkAsPaid = async (id: string) => {
        setLoadingIds(prev => new Set(prev).add(id));
        try {
            await markAsPaid(id);
        } catch (error) {
            console.error(error);
            alert("납부 처리에 실패했습니다.");
        } finally {
            setLoadingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    if (billings.length === 0) {
        return (
            <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <h2 className="font-semibold text-slate-800">전체 청구 및 납부 내역</h2>
                </div>
                <div className="p-8 text-center text-slate-500 text-sm">
                    청구 내역이 없습니다.
                </div>
            </div>
        );
    }

    // Sort billings: uncompleted first, then by year and month descending
    const sortedBillings = [...billings].sort((a, b) => {
        if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
    });

    const displayBillings = isExpanded ? sortedBillings : sortedBillings.slice(0, 3);

    return (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mt-6">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <h2 className="font-semibold text-slate-800">전체 청구 및 납부 내역</h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">총 {billings.length}건</span>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 tracking-wider">청구월</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 tracking-wider">수강 과목</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 tracking-wider">청구 금액</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 tracking-wider">진행 상태</th>
                            <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 tracking-wider">액션</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {displayBillings.map((billing) => (
                            <tr key={billing.id} className={billing.isPaid ? 'bg-slate-50/50' : 'bg-white'}>
                                <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-slate-700">
                                    {billing.year}년 {billing.month}월
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-600">
                                    <div className="font-medium text-slate-800">{billing.enrollment?.subjectName || '알 수 없음'}</div>
                                    <div className="text-xs text-slate-400">목표 {billing.targetSessions}회 / 출석 {billing.attendedSessions}회</div>
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                                    {((billing.enrollment?.feePerSession || 0) * billing.targetSessions).toLocaleString()} ₫
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap text-sm">
                                    {billing.isPaid ? (
                                        <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium border border-emerald-100">
                                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> 납부 완료
                                            {billing.paidAt && <span className="ml-1 opacity-75">({format(new Date(billing.paidAt), 'MM/dd')})</span>}
                                        </span>
                                    ) : billing.targetSessions === 0 ? (
                                        <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                                            이월 (납부 불필요)
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium border border-red-100">
                                            미납 (납부 필요)
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap text-right text-sm">
                                    {!billing.isPaid && billing.targetSessions > 0 && (
                                        <button
                                            onClick={() => handleMarkAsPaid(billing.id)}
                                            disabled={loadingIds.has(billing.id)}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                                        >
                                            {loadingIds.has(billing.id) ? '처리중...' : '납부 확인 (완료 처리)'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {billings.length > 3 && (
                <div className="bg-slate-50 border-t border-slate-200 p-2 text-center">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                    >
                        {isExpanded ? (
                            <><ChevronUp className="w-4 h-4 mr-1" /> 접기</>
                        ) : (
                            <><ChevronDown className="w-4 h-4 mr-1" /> {billings.length - 3}건 더 보기</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
