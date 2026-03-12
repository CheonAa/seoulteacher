"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Users } from "lucide-react";

type AttendanceData = {
    date: Date;
    status: string;
    enrollment: {
        subjectName: string;
        instructor?: { name: string };
    }
};

export default function AttendanceHeadcount({ attendances, role }: { attendances: AttendanceData[], role: 'ADMIN' | 'INSTRUCTOR' }) {
    // Group by date string 'yyyy-MM-dd'
    const groupedByDate = useMemo(() => {
        const groups: Record<string, AttendanceData[]> = {};
        attendances.forEach(att => {
            const d = format(new Date(att.date), 'yyyy-MM-dd');
            if (!groups[d]) groups[d] = [];
            groups[d].push(att);
        });
        return groups;
    }, [attendances]);

    const availableDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
    const [selectedDate, setSelectedDate] = useState<string>(availableDates[0] || format(new Date(), 'yyyy-MM-dd'));

    const currentData = groupedByDate[selectedDate] || [];

    // Group current data by subject
    const subjectStats = useMemo(() => {
        const stats: Record<string, { present: number, absent: number, excused: number, total: number }> = {};
        currentData.forEach(att => {
            const key = role === 'ADMIN' && att.enrollment.instructor
                ? `${att.enrollment.subjectName} (강사: ${att.enrollment.instructor.name})`
                : att.enrollment.subjectName;

            if (!stats[key]) {
                stats[key] = { present: 0, absent: 0, excused: 0, total: 0 };
            }
            stats[key].total += 1;
            if (att.status === 'PRESENT') stats[key].present += 1;
            else if (att.status === 'ABSENT') stats[key].absent += 1;
            else if (att.status === 'EXCUSED' || att.status === 'SICK') stats[key].excused += 1;
        });
        return Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]));
    }, [currentData, role]);

    if (attendances.length === 0) return null;

    return (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h3 className="text-lg font-medium text-slate-900 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    날짜별 출석 인원 현황
                </h3>
                <div className="flex items-center space-x-2">
                    <label className="text-sm text-slate-500">날짜 선택:</label>
                    <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                    >
                        {availableDates.length > 0 ? availableDates.map(d => (
                            <option key={d} value={d}>{d}</option>
                        )) : (
                            <option value={selectedDate}>{selectedDate}</option>
                        )}
                    </select>
                </div>
            </div>

            {subjectStats.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center bg-slate-50 rounded-md border border-slate-100">해당 날짜의 출결 기록이 없습니다.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {subjectStats.map(([subject, stats]) => (
                        <div key={subject} className="bg-slate-50 rounded-md p-4 border border-slate-200 flex flex-col justify-between hover:border-blue-300 transition-colors">
                            <h4 className="font-semibold text-slate-800 text-[15px] mb-3 truncate" title={subject}>{subject}</h4>
                            <div className="flex justify-between items-end">
                                <div className="text-xs text-slate-500 font-medium">
                                    총 인원: <span className="font-bold text-slate-700 text-sm">{stats.total}</span>명
                                </div>
                                <div className="text-right flex flex-col items-end gap-1.5">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">
                                        출석 {stats.present}
                                    </span>
                                    {(stats.absent > 0 || stats.excused > 0) && (
                                        <div className="flex gap-1.5 mt-1">
                                            {stats.absent > 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                                    무단결석 {stats.absent}
                                                </span>
                                            )}
                                            {stats.excused > 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                    공결(병결) {stats.excused}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
