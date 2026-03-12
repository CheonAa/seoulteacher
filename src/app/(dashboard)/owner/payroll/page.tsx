"use client";

import { useState, useEffect, useRef } from "react";
import { Save, CalendarDays, RefreshCw, Upload, Download } from "lucide-react";
import * as xlsx from "xlsx";

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
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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

    const handleDownloadExcel = () => {
        const dataForExcel = payrolls.map(p => ({
            "강사명": p.name,
            "총 급여 VND": p.totalTuitionVND,
            "보험 공제": p.insuranceDeduction,
            "베트남 실수령": p.netVietnamSalary,
            "적용 환율": p.exchangeRate,
            "송금 수수료": p.transferFee,
        }));

        const worksheet = xlsx.utils.json_to_sheet(dataForExcel);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "급여 정산");

        // Auto-size columns loosely based on text
        const wscols = [
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
        worksheet['!cols'] = wscols;

        xlsx.writeFile(workbook, `${year}년_${month}월_급여_정산.xlsx`);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const workbook = xlsx.read(bstr, { type: "binary" });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const data = xlsx.utils.sheet_to_json<any>(sheet);

                    const newPayrolls = [...payrolls];
                    
                    data.forEach((row: any) => {
                        const name = row["강사명"];
                        if (!name) return;

                        const idx = newPayrolls.findIndex(p => p.name === name);
                        if (idx !== -1) {
                            // Update fields if they exist in the Excel row
                            if (row["보험 공제"] !== undefined) {
                                newPayrolls[idx].insuranceDeduction = Number(row["보험 공제"]) || 0;
                            }
                            if (row["베트남 실수령"] !== undefined) {
                                newPayrolls[idx].netVietnamSalary = Number(row["베트남 실수령"]) || 0;
                            }
                            if (row["적용 환율"] !== undefined) {
                                newPayrolls[idx].exchangeRate = Number(row["적용 환율"]) || 0;
                            }
                            if (row["송금 수수료"] !== undefined) {
                                newPayrolls[idx].transferFee = Number(row["송금 수수료"]) || 0;
                            }
                        }
                    });

                    setPayrolls(newPayrolls);
                    alert("엑셀 데이터가 화면에 적용되었습니다. 저장하려면 [정산 저장] 버튼을 눌러주세요.");
                } catch (err: any) {
                    setError("파일 파싱 중 오류가 발생했습니다: " + err.message);
                } finally {
                    setUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }
            };
            reader.readAsBinaryString(file);
        } catch (err: any) {
            setError("파일 읽기 중 오류가 발생했습니다: " + err.message);
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
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
                            onClick={handleDownloadExcel}
                            title="엑셀 양식 다운로드"
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <div className="w-[1px] h-6 bg-slate-300 mx-1"></div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            title="엑셀 파일 업로드"
                            className={`p-1.5 rounded transition ${uploading ? "text-slate-400 cursor-not-allowed" : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"}`}
                        >
                            <Upload className="w-5 h-5" />
                        </button>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
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
