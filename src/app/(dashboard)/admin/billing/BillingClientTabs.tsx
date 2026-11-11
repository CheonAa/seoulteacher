'use client';

import { useState } from 'react';
import { Landmark, Receipt } from 'lucide-react';
import DepositReconciliationTable, { DepositRecordItem } from './DepositReconciliationTable';
import BillingTable from './BillingTable';

interface Props {
    deposits: DepositRecordItem[];
    billings: any[];
    instructors: { id: string; name: string }[];
    students: { id: string; name: string }[];
    role: string;
}

export default function BillingClientTabs({
    deposits,
    billings,
    instructors,
    students,
    role
}: Props) {
    const [activeTab, setActiveTab] = useState<'deposits' | 'billings'>('deposits');

    return (
        <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-slate-200 bg-slate-50/60 px-4 sm:px-6 pt-3">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('deposits')}
                        className={`inline-flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
                            activeTab === 'deposits'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <Landmark className="w-4 h-4" />
                        통장 입금 대사 내역
                        <span
                            className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                                activeTab === 'deposits'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-200 text-slate-600'
                            }`}
                        >
                            {deposits.length.toLocaleString()}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('billings')}
                        className={`inline-flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
                            activeTab === 'billings'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <Receipt className="w-4 h-4" />
                        월별 청구 내역
                        <span
                            className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                                activeTab === 'billings'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-200 text-slate-600'
                            }`}
                        >
                            {billings.length.toLocaleString()}
                        </span>
                    </button>
                </nav>
            </div>

            {activeTab === 'deposits' ? (
                <div>
                    <div className="px-4 py-4 sm:px-6 border-b border-slate-100">
                        <h3 className="text-base font-semibold text-slate-900">통장 입금 대사 목록</h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                            계좌 입금 내역과 매칭 수강생, 담당 강사 및 입금 대사 결과를 확인·관리합니다.
                        </p>
                    </div>
                    <DepositReconciliationTable
                        initialDeposits={deposits}
                        instructors={instructors}
                        students={students}
                        role={role}
                    />
                </div>
            ) : (
                <div>
                    <div className="px-4 py-4 sm:px-6 border-b border-slate-100">
                        <h3 className="text-base font-semibold text-slate-900">전체 청구 내역</h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                            학생들의 당월 / 이월 청구 내역을 관리합니다.
                        </p>
                    </div>
                    <BillingTable billings={billings} role={role} />
                </div>
            )}
        </div>
    );
}
