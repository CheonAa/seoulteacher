"use client";

import { Doughnut } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface InstructorSalaryChartProps {
    totalTuitionVND: number;
    instructorShareVND: number;
    insuranceFee: number;
    tax35Deduction: number;
    remainingVND: number;
    finalKRW: number;
    transferFee: number;
    krwTax33: number;
    finalNetKRW: number;
}

export default function InstructorSalaryChart({
    totalTuitionVND,
    instructorShareVND,
    insuranceFee,
    tax35Deduction,
    remainingVND,
    finalKRW,
    transferFee,
    krwTax33,
    finalNetKRW
}: InstructorSalaryChartProps) {
    const dataVND = {
        labels: ["베트남 실수령액", "보험료", "베트남 소득세(3.5%)"],
        datasets: [
            {
                data: [remainingVND, insuranceFee, tax35Deduction],
                backgroundColor: [
                    "rgba(59, 130, 246, 0.8)", // blue-500
                    "rgba(245, 158, 11, 0.8)", // amber-500
                    "rgba(239, 68, 68, 0.8)"   // red-500
                ],
                borderColor: [
                    "rgba(59, 130, 246, 1)",
                    "rgba(245, 158, 11, 1)",
                    "rgba(239, 68, 68, 1)"
                ],
                borderWidth: 1,
            }
        ]
    };

    const dataKRW = {
        labels: ["최종 수령액", "송금 수수료", "한국 원천징수(3.3%)"],
        datasets: [
            {
                data: [finalNetKRW, transferFee, krwTax33],
                backgroundColor: [
                    "rgba(16, 185, 129, 0.8)", // emerald-500
                    "rgba(245, 158, 11, 0.8)", // amber-500
                    "rgba(239, 68, 68, 0.8)"   // red-500
                ],
                borderColor: [
                    "rgba(16, 185, 129, 1)",
                    "rgba(245, 158, 11, 1)",
                    "rgba(239, 68, 68, 1)"
                ],
                borderWidth: 1,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8
                }
            }
        },
        cutout: '70%'
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg shadow border border-slate-200">
            <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">베트남 정산 비율 (VND)</h3>
                <div className="w-full h-48 relative">
                    {instructorShareVND > 0 ? (
                        <>
                            <Doughnut data={dataVND} options={options} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                                <span className="text-[10px] text-slate-500">배분 총액</span>
                                <span className="text-sm font-bold text-slate-800">{Math.floor(instructorShareVND).toLocaleString()}</span>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">데이터 없음</div>
                    )}
                </div>
            </div>
            <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">한국 정산 비율 (KRW)</h3>
                <div className="w-full h-48 relative">
                    {finalKRW > 0 ? (
                        <>
                            <Doughnut data={dataKRW} options={options} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                                <span className="text-[10px] text-slate-500">환전 총액</span>
                                <span className="text-sm font-bold text-slate-800">₩{Math.floor(finalKRW).toLocaleString()}</span>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">데이터 없음</div>
                    )}
                </div>
            </div>
        </div>
    );
}
