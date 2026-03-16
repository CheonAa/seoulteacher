"use client";

import { useState, useRef } from 'react';
import * as xlsx from 'xlsx';
import { Upload, CheckCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    billings: any[];
}

interface MatchResult {
    billingId: string;
    studentName: string;
    subjectName: string;
    amount: number;
    matchedBy: 'ENGLISH_NAME' | 'DEPOSITOR_NAME' | 'ACCOUNT_NUMBER';
    excelRow: any;
}

export default function ExcelDepositMatcher({ billings }: Props) {
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = xlsx.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Assuming the Excel format has specific columns. 
            // V1: just pure JSON array of rows. Needs header row.
            const jsonData: any[] = xlsx.utils.sheet_to_json(worksheet);

            const foundMatches: MatchResult[] = [];
            const unpaidBillings = billings.filter(b => !b.isPaid && b.targetSessions > 0);

            jsonData.forEach(row => {
                // Determine column names based on the user's screenshot
                // "참조번호" (Reference Number) usually contains account number like 7000...
                // "비고" (Remarks) usually contains Shin woo jin/CHUN SUNYOUNG
                // "입금" (Deposit) contains amount

                const refNumber = row['참조번호'] ? String(row['참조번호']) : '';
                const remarks = row['비고'] ? String(row['비고']).toLowerCase() : '';
                // Handle comma separated numbers
                const rawAmount = row['입금'] || row['입금액'];
                const depositStr = typeof rawAmount === 'string' ? rawAmount.replace(/,/g, '') : String(rawAmount || '0');
                const depositAmount = parseInt(depositStr, 10);
                
                if (depositAmount <= 0) return; // Ignore pure withdrawals

                for (const billing of unpaidBillings) {
                    const enr = billing.enrollment;
                    const student = enr.student;
                    const parents = student.parents || [];
                    
                    const expectedAmount = enr.feePerSession * billing.targetSessions;
                    let matchedBy: MatchResult['matchedBy'] | null = null;

                    // 1. Match by Account Number (7000...)
                    if (enr.accountNumber && refNumber.includes(enr.accountNumber)) {
                        matchedBy = 'ACCOUNT_NUMBER';
                    }
                    // 2. Match by Depositor Name exact or included (supporting multiple names separated by comma)
                    else if (enr.depositorName) {
                        const depositorNames = enr.depositorName.split(',').map((n: string) => n.trim().toLowerCase()).filter(Boolean);
                        if (depositorNames.some((name: string) => remarks.includes(name))) {
                            matchedBy = 'DEPOSITOR_NAME';
                        }
                    }
                    // 3. Match by English Name
                    else {
                        const allEnglishNames = [
                            student.englishName,
                            ...parents.map((p: any) => p.englishName)
                        ].filter(Boolean).map((n: string) => n.toLowerCase());

                        if (allEnglishNames.some(name => remarks.includes(name))) {
                            matchedBy = 'ENGLISH_NAME';
                        }
                    }

                    if (matchedBy) {
                        foundMatches.push({
                            billingId: billing.id,
                            studentName: student.name,
                            subjectName: enr.subjectName,
                            amount: expectedAmount,
                            matchedBy,
                            excelRow: row
                        });
                        // Once matched, don't match this billing against other rows to prevent duplicates in UI
                        break;
                    }
                }
            });

            setMatches(foundMatches);
            setShowModal(true);
        } catch (error) {
            console.error("Excel parse error", error);
            alert("엑셀 파일 처리 중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const confirmMatches = async () => {
        if (matches.length === 0) return;
        setIsProcessing(true);

        try {
            // Call API to mark these billings as paid
            const res = await fetch('/api/admin/billing/bulk-paid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ billingIds: matches.map(m => m.billingId) })
            });

            if (!res.ok) throw new Error("Bulk update failed");

            alert(`${matches.length}건의 입금이 성공적으로 확인되었습니다.`);
            setShowModal(false);
            router.refresh();
        } catch (error) {
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="flex items-center">
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    <Upload className="w-4 h-4 mr-2 text-slate-500" />
                    {isProcessing ? '처리중...' : '엑셀로 자동 입금 확인'}
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <CheckCircle className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            입금 내역 확인 ({matches.length}건)
                                        </h3>
                                        <div className="mt-4 max-h-96 overflow-y-auto pr-2">
                                            {matches.length === 0 ? (
                                                <p className="text-sm text-gray-500 py-4">
                                                    엑셀 파일에서 일치하는 입금 내역을 찾을 수 없습니다. (입금자명, 학생 영문명, 또는 참조계좌번호)
                                                </p>
                                            ) : (
                                                <ul className="divide-y divide-gray-200">
                                                    {matches.map((match, i) => (
                                                        <li key={i} className="py-4 flex justify-between">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {match.studentName} <span className="text-gray-500 font-normal">({match.subjectName})</span>
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    조건: {
                                                                        match.matchedBy === 'ACCOUNT_NUMBER' ? '가상계좌번호 (7000...) 일치' :
                                                                        match.matchedBy === 'DEPOSITOR_NAME' ? '입금자명 일치' : '영문명 일치'
                                                                    }
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-bold text-blue-600">
                                                                    {match.amount.toLocaleString()} VND
                                                                </p>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    엑셀 비고: {match.excelRow['비고'] || '-'}
                                                                </p>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                                <button
                                    type="button"
                                    disabled={isProcessing || matches.length === 0}
                                    onClick={confirmMatches}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    {isProcessing ? '처리중...' : '일괄 납부 확인'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
