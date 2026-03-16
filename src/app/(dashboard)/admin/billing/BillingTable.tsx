'use client';

import { useState } from 'react';
import { markAsPaid } from '../actions';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';
import ExcelDepositMatcher from './ExcelDepositMatcher';

export default function BillingTable({ billings, role }: { billings: any[], role: string }) {
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

    const handleMarkAsPaid = async (id: string) => {
        setLoadingIds(prev => new Set(prev).add(id));
        await markAsPaid(id);
        setLoadingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    return (
        <div className="space-y-4">
            {role === 'OWNER' && (
                <div className="flex justify-end px-6 pt-4">
                    <ExcelDepositMatcher billings={billings} />
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            청구월
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            학생 이름
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            수강 과목
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            수강료 / 회차
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            출석 현황
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">액션</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {billings.map((billing) => (
                        <tr key={billing.id} className={billing.isPaid ? 'bg-slate-50' : 'bg-white'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {billing.year}년 {billing.month}월
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{billing.enrollment.student.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {billing.enrollment.subjectName}
                                <div className="text-xs text-slate-400">{billing.enrollment.instructor.name} 강사</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {(billing.enrollment.feePerSession * billing.targetSessions).toLocaleString()} VND
                                <div className="text-xs text-slate-400">목표 {billing.targetSessions}회</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                <div className="flex flex-col">
                                    <span>출석: {billing.attendedSessions}회</span>
                                    <span className="text-red-500 font-medium cursor-help" title={`잔여 횟수 = (전월 이월 + 이번달 추가목표 ${billing.targetSessions}회) - 출석 ${billing.attendedSessions}회`}>
                                        이월 잔여: {billing.carryOverSessions}회
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {billing.isPaid ? (
                                    <span className="inline-flex items-center text-green-600 font-medium">
                                        <CheckCircle className="w-4 h-4 mr-1" /> 
                                        납부완료 
                                        {billing.paidAt && <span className="text-xs ml-1 text-green-500">({format(new Date(billing.paidAt), 'yy/MM/dd')})</span>}
                                    </span>
                                ) : billing.targetSessions === 0 ? (
                                    <span className="inline-flex items-center text-slate-500 font-medium text-xs bg-slate-100 px-2 py-1 rounded">
                                        이월로 대체<br/>(납부 불필요)
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleMarkAsPaid(billing.id)}
                                        disabled={loadingIds.has(billing.id)}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {loadingIds.has(billing.id) ? '처리중...' : '납부확인'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {billings.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-sm text-slate-500">
                                청구 내역이 없습니다.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        </div>
    );
}
