"use client";

import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
} from "chart.js";

ChartJS.register(Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface InstructorPayrollChartProps {
    payroll: {
        totalTuitionVND: number;
        insuranceDeduction: number;
        tax35Deduction?: number;
        remainingVND?: number;
        exchangedKRW?: number;
        transferFee: number;
        tax33Deduction?: number;
        netPaidKRW?: number;
    }
}

export default function InstructorPayrollChart({ payroll }: InstructorPayrollChartProps) {
    const dataVND = {
        labels: ["VND 정산 비율"],
        datasets: [
            {
                label: "베트남 실수령",
                data: [payroll.remainingVND || 0],
                backgroundColor: "rgba(59, 130, 246, 0.8)",
            },
            {
                label: "보험료",
                data: [payroll.insuranceDeduction || 0],
                backgroundColor: "rgba(245, 158, 11, 0.8)",
            },
            {
                label: "소득세(3.5%)",
                data: [payroll.tax35Deduction || 0],
                backgroundColor: "rgba(239, 68, 68, 0.8)",
            }
        ]
    };

    const dataKRW = {
        labels: ["KRW 정산 비율"],
        datasets: [
            {
                label: "최종 수령액",
                data: [payroll.netPaidKRW || 0],
                backgroundColor: "rgba(16, 185, 129, 0.8)",
            },
            {
                label: "송금 수수료",
                data: [payroll.transferFee || 0],
                backgroundColor: "rgba(245, 158, 11, 0.8)",
            },
            {
                label: "원천징수(3.3%)",
                data: [payroll.tax33Deduction || 0],
                backgroundColor: "rgba(239, 68, 68, 0.8)",
            }
        ]
    };

    const options = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { stacked: true },
            y: { stacked: true }
        },
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { boxWidth: 12 }
            }
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm h-[180px]">
                <Bar data={dataVND} options={options} />
            </div>
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm h-[180px]">
                <Bar data={dataKRW} options={options} />
            </div>
        </div>
    );
}
