"use client";

import { useState, useEffect, useRef } from "react";
import { Save, CalendarDays, RefreshCw, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NanumGothicBase64 } from "@/lib/fonts/NanumGothic-Regular";

type PayrollData = {
    instructorProfileId: string;
    userId: string;
    name: string;
    baseRate: number;
    
    // Auto-calculated from DB Attendances initially
    totalTuitionVND: number;
    
    // Editable Inputs
    insuranceDeduction: number;
    netVietnamSalary: number; // The target "Take-home" in VND (28,000,000 etc.)
    exchangeRate: number;
    transferFee: number;
    
    // Derived values (computed on the fly for the UI, then saved via POST)
    grossVietnamSalary?: number;
    tax35Deduction?: number;
    remainingVND?: number;
    exchangedKRW?: number;
    preTaxKRW?: number;
    tax33Deduction?: number;
    netPaidKRW?: number;

    isSaved: boolean;
};

export default function OwnerPayrollPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloadingPDF, setDownloadingPDF] = useState(false);
    
    const [year, setYear] = useState(new Date().getFullYear());
    // Default to previous month if today is before the 5th, else current month?
    // Let's just default to current month for simplicity, or previous month.
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    
    const [payrolls, setPayrolls] = useState<PayrollData[]>([]);

    const fetchPayrolls = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/payroll?year=${year}&month=${month}`);
            if (!res.ok) throw new Error("급여 데이터를 불러오는데 실패했습니다.");
            const data = await res.json();
            
            // Map the data to include correct default names if not saved
            const initialized = data.payrolls.map((p: any) => ({
                ...p,
                insuranceDeduction: p.insuranceDeduction !== undefined ? p.insuranceDeduction : p.insuranceFee,
                netVietnamSalary: p.netVietnamSalary || 0,
                exchangeRate: p.exchangeRate || 0,
                transferFee: p.transferFee !== undefined ? p.transferFee : 23000,
            }));
            
            setPayrolls(initialized);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayrolls();
    }, [year, month]);

    // Live Math Calculation for the table rows
    const calculateRow = (p: PayrollData) => {
        const grossVietnamSalary = p.netVietnamSalary > 0 ? Math.floor(p.netVietnamSalary / (1 - 0.035)) : 0;
        const tax35Deduction = grossVietnamSalary - p.netVietnamSalary;
        
        const remainingVND = p.totalTuitionVND - p.insuranceDeduction - grossVietnamSalary;
        
        const exchangeRate = p.exchangeRate > 0 ? p.exchangeRate : 1; 
        const exchangedKRW = p.exchangeRate > 0 ? Math.floor(remainingVND / exchangeRate) : 0;
        
        const preTaxKRW = exchangedKRW > 0 ? exchangedKRW - p.transferFee : 0;
        const tax33Deduction = preTaxKRW > 0 ? Math.round(preTaxKRW * 0.033) : 0;
        const netPaidKRW = preTaxKRW - tax33Deduction;

        return {
            ...p,
            grossVietnamSalary,
            tax35Deduction,
            remainingVND,
            exchangedKRW,
            preTaxKRW,
            tax33Deduction,
            netPaidKRW
        };
    };

    const handleInputChange = (index: number, field: keyof PayrollData, value: string) => {
        const numValue = value === "" ? 0 : Number(value);
        const newPayrolls = [...payrolls];
        newPayrolls[index] = {
            ...newPayrolls[index],
            [field]: numValue
        };
        setPayrolls(newPayrolls);
    };

    const handleDownloadPDF = () => {
        setDownloadingPDF(true);
        try {
            const doc = new jsPDF("landscape");
            
            // Add Korean Font
            doc.addFileToVFS("NanumGothic-Regular.ttf", NanumGothicBase64);
            doc.addFont("NanumGothic-Regular.ttf", "NanumGothic", "normal");
            doc.setFont("NanumGothic");

            doc.setFontSize(18);
            doc.text(`${year}년 ${month}월 강사 급여 정산 명세서`, 14, 22);
            
            doc.setFontSize(11);
            doc.text(`출력 일자: ${new Date().toLocaleDateString('ko-KR')}`, 14, 30);

            const tableColumn = [
                "강사명", "총 급여 VND", "보험 공제", "베트남 실수령", "3.5% 세금", "잔여 VND", 
                "적용 환율", "환전 KRW", "송금 수수료", "3.3% 세금", "최종 지급 KRW"
            ];
            const tableRows: any[] = [];

            payrolls.forEach(rawPayroll => {
                const p = calculateRow(rawPayroll);
                tableRows.push([
                    p.name,
                    formatVND(p.totalTuitionVND),
                    formatVND(p.insuranceDeduction),
                    formatVND(p.netVietnamSalary),
                    formatVND(p.tax35Deduction || 0),
                    formatVND(p.remainingVND || 0),
                    formatVND(p.exchangeRate),
                    formatKRW(p.exchangedKRW || 0),
                    formatKRW(p.transferFee),
                    formatKRW(p.tax33Deduction || 0),
                    formatKRW(p.netPaidKRW || 0)
                ]);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 36,
                styles: { font: "NanumGothic", fontStyle: "normal", fontSize: 9, halign: 'right' },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center', fontStyle: "normal" },
                columnStyles: { 0: { halign: 'left' } }, // Instructor name aligned left
                theme: 'grid'
            });

            doc.save(`${year}년_${month}월_급여_정산_명세서.pdf`);
        } catch (err: any) {
            alert("PDF 생성 중 오류가 발생했습니다. 폰트 파일이 올바르게 설정되었는지 확인해 주세요. (" + err.message + ")");
        } finally {
            setDownloadingPDF(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                year,
                month,
                payrolls: payrolls.map(p => {
                    // We only need to send the inputs and base total, backend recalculates derivations to be safe
                    return {
                        instructorProfileId: p.instructorProfileId,
                        totalTuitionVND: p.totalTuitionVND,
                        insuranceDeduction: p.insuranceDeduction,
                        netVietnamSalary: p.netVietnamSalary,
                        exchangeRate: p.exchangeRate,
                        transferFee: p.transferFee,
                    };
                })
            };

            const res = await fetch("/api/admin/payroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("저장에 실패했습니다.");
            alert(`${year}년 ${month}월 급여 정산이 저장되었습니다.`);
            fetchPayrolls(); // Refresh to get isSaved = true
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const formatVND = (num: number) => new Intl.NumberFormat('ko-KR').format(num);
    const formatKRW = (num: number) => new Intl.NumberFormat('ko-KR').format(num);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-blue-600" />
                        전체 급여 정산
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">월별 강사 급여를 계산하고 명세서를 발행합니다.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <select 
                        value={year} 
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}년</option>
                        ))}
                    </select>
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{m}월</option>
                        ))}
                    </select>
                    <button 
                        onClick={fetchPayrolls}
                        className="p-2 bg-white border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50"
                        title="새로고침"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center bg-slate-100 rounded-md p-1 border border-slate-200 ml-2">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={downloadingPDF}
                            title="PDF 명세서 다운로드"
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition flex items-center gap-1.5 text-sm font-medium px-3"
                        >
                            <FileText className="w-4 h-4" /> 
                            {downloadingPDF ? "PDF 변환 중..." : "PDF 다운로드"}
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "저장 중..." : "정산 저장"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th rowSpan={2} className="px-3 py-3 text-left font-semibold text-slate-900 border-r border-slate-200">강사명</th>
                                <th colSpan={5} className="px-3 py-2 text-center font-semibold text-slate-900 border-r border-slate-200 border-b border-slate-200 bg-blue-50/50">베트남 급여 계산 (VND)</th>
                                <th colSpan={5} className="px-3 py-2 text-center font-semibold text-slate-900 bg-emerald-50/50 border-b border-slate-200">한국 급여 계산 (KRW)</th>
                            </tr>
                            <tr>
                                <th className="px-3 py-2 text-right font-medium text-slate-700 border-r border-slate-200">총 급여 VND<br/><span className="text-[10px] text-slate-400 font-normal">(수강료×비율)</span></th>
                                <th className="px-3 py-2 text-right font-medium text-slate-700 bg-yellow-50 border-r border-slate-200">보험 공제<br/><span className="text-[10px] text-slate-400 font-normal">(입력)</span></th>
                                <th className="px-3 py-2 text-right font-medium text-slate-700 bg-yellow-50 border-r border-slate-200">베트남 실수령<br/><span className="text-[10px] text-slate-400 font-normal">(입력)</span></th>
                                <th className="px-3 py-2 text-right font-medium text-slate-700 border-r border-slate-200">3.5% 세금<br/><span className="text-[10px] text-slate-400 font-normal">(역계산)</span></th>
                                <th className="px-3 py-2 text-right font-medium text-slate-700 border-r border-slate-200 text-blue-600">잔여 급여<br/><span className="text-[10px] text-slate-400 font-normal">(총급여-보험-세전베트남)</span></th>
                                
                                <th className="px-3 py-2 text-right font-medium text-slate-700 bg-yellow-50 border-r border-slate-200">적용 환율<br/><span className="text-[10px] text-slate-400 font-normal">(입력)</span></th>
                                <th className="px-3 py-2 text-right font-medium text-slate-700 border-r border-slate-200">환전 KRW<br/><span className="text-[10px] text-slate-400 font-normal">(잔여/환율)</span></th>
                                <th className="px-3 py-2 text-right font-medium text-slate-700 bg-yellow-50 border-r border-slate-200">송금 수수료<br/><span className="text-[10px] text-slate-400 font-normal">(입력)</span></th>
                                <th className="px-3 py-2 text-right font-medium text-slate-700 border-r border-slate-200">3.3% 세금<br/><span className="text-[10px] text-slate-400 font-normal">(환전-수수료의 3.3%)</span></th>
                                <th className="px-3 py-2 text-right font-bold text-emerald-600">최종 지급액<br/><span className="text-[10px] text-slate-400 font-normal">(세후 KRW)</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-slate-500">
                                        데이터를 불러오는 중입니다...
                                    </td>
                                </tr>
                            ) : payrolls.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-slate-500">
                                        등록된 강사 프로필이 없거나 데이터를 불러올 수 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                payrolls.map((rawPayroll, idx) => {
                                    const p = calculateRow(rawPayroll);
                                    return (
                                        <tr key={p.instructorProfileId} className="hover:bg-slate-50">
                                            <td className="px-3 py-4 whitespace-nowrap font-medium text-slate-900 border-r border-slate-200">
                                                {p.name}
                                                {p.isSaved && (
                                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                                        저장됨
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-right text-slate-700 border-r border-slate-200">
                                                {formatVND(p.totalTuitionVND)}
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap border-r border-slate-200 bg-yellow-50/30">
                                                <input 
                                                    type="number" 
                                                    value={p.insuranceDeduction || ''}
                                                    onChange={(e) => handleInputChange(idx, 'insuranceDeduction', e.target.value)}
                                                    className="w-24 text-right border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs py-1 px-2"
                                                />
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap border-r border-slate-200 bg-yellow-50/30">
                                                <input 
                                                    type="number" 
                                                    value={p.netVietnamSalary || ''}
                                                    onChange={(e) => handleInputChange(idx, 'netVietnamSalary', e.target.value)}
                                                    className="w-28 text-right border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs py-1 px-2"
                                                />
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-right text-slate-500 border-r border-slate-200">
                                                {formatVND(p.tax35Deduction || 0)}
                                                <div className="text-[10px] text-slate-400 mt-0.5">세전: {formatVND(p.grossVietnamSalary || 0)}</div>
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-right font-medium text-blue-600 border-r border-slate-200">
                                                {formatVND(p.remainingVND || 0)}
                                            </td>

                                            <td className="px-3 py-4 whitespace-nowrap border-r border-slate-200 bg-yellow-50/30">
                                                <input 
                                                    type="number" 
                                                    step="0.001"
                                                    value={p.exchangeRate || ''}
                                                    onChange={(e) => handleInputChange(idx, 'exchangeRate', e.target.value)}
                                                    className="w-20 text-right border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs py-1 px-2"
                                                />
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-right text-slate-700 border-r border-slate-200">
                                                {formatKRW(p.exchangedKRW || 0)}
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap border-r border-slate-200 bg-yellow-50/30">
                                                <input 
                                                    type="number" 
                                                    value={p.transferFee || ''}
                                                    onChange={(e) => handleInputChange(idx, 'transferFee', e.target.value)}
                                                    className="w-20 text-right border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs py-1 px-2"
                                                />
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-right text-slate-500 border-r border-slate-200">
                                                {formatKRW(p.tax33Deduction || 0)}
                                                <div className="text-[10px] text-slate-400 mt-0.5">세전: {formatKRW(p.preTaxKRW || 0)}</div>
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-right font-bold text-emerald-600 bg-emerald-50/30">
                                                {formatKRW(p.netPaidKRW || 0)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                    <p>노란색 배경의 입력칸(보험, 베트남 실수령액, 환율, 수수료)을 채우면 나머지 세금 및 환전액이 자동 계산됩니다.</p>
                </div>
            </div>
        </div>
    );
}
