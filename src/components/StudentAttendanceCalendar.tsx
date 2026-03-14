"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from "lucide-react";

type AttendanceRecord = {
    id: string;
    date: Date;
    status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
    enrollment: {
        subjectName: string;
        instructor: { name: string };
    };
};

export default function StudentAttendanceCalendar({ studentId }: { studentId: string }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true);
            try {
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth() + 1;
                const res = await fetch(`/api/students/${studentId}/attendance?year=${year}&month=${month}`);
                if (res.ok) {
                    const data = await res.json();
                    setAttendances(data);
                }
            } catch (error) {
                console.error("Failed to fetch calendar attendance:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [studentId, currentMonth]);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad beginning of month
    const startDayOfWeek = getDay(monthStart);
    const blanks = Array.from({ length: startDayOfWeek }).map((_, i) => null);
    
    // Pad end of month
    const endDayOfWeek = getDay(monthEnd);
    const endBlanks = Array.from({ length: 6 - endDayOfWeek }).map((_, i) => null);

    const allDays = [...blanks, ...daysInMonth, ...endBlanks];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PRESENT': return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
            case 'ABSENT': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
            case 'EXCUSED': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
            default: return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PRESENT': return '출석';
            case 'ABSENT': return '결석';
            case 'EXCUSED': return '공결(병결)';
            default: return status;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-semibold text-slate-800 text-lg">월별 출결 현황</h2>
                </div>
                <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-lg p-1 shadow-sm">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-sm font-bold text-slate-800 px-3 select-none min-w-[100px] text-center">
                        {format(currentMonth, 'yyyy년 MM월')}
                    </div>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-5">
                {/* Legend */}
                <div className="flex items-center justify-end gap-3 mb-4 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>출석</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>무단결석</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>공결/병결</div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                    {/* Days Header */}
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} className={`bg-slate-50 text-center py-2 text-xs font-semibold ${
                            i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'
                        }`}>
                            {day}
                        </div>
                    ))}
                    
                    {/* Days Cells */}
                    {allDays.map((date, i) => {
                        if (!date) {
                            return <div key={`blank-${i}`} className="bg-slate-50/50 min-h-[90px] p-2"></div>;
                        }

                        // Find attendances for this day
                        const dayAttendances = attendances.filter(att => isSameDay(new Date(att.date), date));
                        const isToday = isSameDay(date, new Date());
                        const isWeekend = getDay(date) === 0 || getDay(date) === 6;

                        return (
                            <div key={date.toString()} className={`bg-white min-h-[90px] p-1.5 sm:p-2 flex flex-col transition-colors hover:bg-slate-50 relative group ${isWeekend ? 'bg-slate-50/20' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                                        isToday ? 'bg-indigo-600 text-white shadow-sm' : 
                                        getDay(date) === 0 ? 'text-red-500' : 
                                        getDay(date) === 6 ? 'text-blue-500' : 
                                        'text-slate-700'
                                    }`}>
                                        {format(date, 'd')}
                                    </span>
                                </div>
                                <div className="mt-1 flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                                    {loading ? null : dayAttendances.map(att => {
                                        const style = getStatusStyle(att.status);
                                        return (
                                            <div key={att.id} className={`text-[10px] leading-tight px-1.5 py-1 rounded border ${style.bg} ${style.border} ${style.text} flex flex-col gap-0.5 relative`}>
                                                <div className="font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                                                    {att.enrollment.subjectName}
                                                </div>
                                                <div className="text-[9px] opacity-80 flex justify-between items-center">
                                                    <span>{format(new Date(att.date), 'HH:mm')}</span>
                                                    <span className="font-semibold">{getStatusLabel(att.status)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
