"use client";

import { useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getDay } from "date-fns";
import { Users, Edit2, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Utility to ensure week starts on Monday (1)
const getWeekInterval = (date: Date) => {
    return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 })
    };
};

type AttendanceData = {
    id: string;
    date: Date;
    status: string; // PRESENT, ABSENT, EXCUSED
    method: string; // MANUAL, QR_SCAN
    creatorId: string | null;
    enrollment: {
        id: string;
        subjectName: string;
        remainingSessions?: number;
        attendedSessions?: number;
        targetSessions?: number;
        student: { id: string; name: string };
        instructor: { id: string; name: string };
    };
};

export default function AttendanceRoster({
    attendances,
    role,
    currentUserId
}: {
    attendances: AttendanceData[],
    role: 'ADMIN' | 'INSTRUCTOR' | 'OWNER',
    currentUserId: string
}) {
    const router = useRouter();

    // Week Date Tracking
    const [currentWeekDates, setCurrentWeekDates] = useState<Date>(() => new Date());

    const weekInterval = useMemo(() => getWeekInterval(currentWeekDates), [currentWeekDates]);
    const weekDays = useMemo(() => eachDayOfInterval(weekInterval), [weekInterval]);

    // Format week title (e.g. "2024년 3월 2주차")
    const weekTitle = `${format(weekInterval.start, 'yyyy년 MM월 dd일')} ~ ${format(weekInterval.end, 'MM월 dd일')}`;

    const handlePrevWeek = () => setCurrentWeekDates(prev => subWeeks(prev, 1));
    const handleNextWeek = () => setCurrentWeekDates(prev => addWeeks(prev, 1));

    // Under the selected week, group by Class/Subject, then organize by student and their weekly attendance
    const groupedByClass = useMemo(() => {
        // Step 1: Filter attendances within the selected week (Mon - Sun)
        const weeklyAttendances = attendances.filter(att => {
            const date = new Date(att.date);
            return date >= weekInterval.start && date <= weekInterval.end;
        });

        // Step 2: Group relevant enrollments by Class Key
        type StudentMatrix = {
            enrollment: AttendanceData['enrollment'];
            // Key: date formatted as yyyy-MM-dd
            records: Record<string, AttendanceData[]>;
            weeklyTotal: number;
        };

        const classStats: Record<string, Record<string, StudentMatrix>> = {};

        // We should first populate classes/students even if they didn't attend this week, 
        // but for simplicity in a roster, showing only those who have any activity *or* just scanning all enrollments from attendances dataset.
        // It's safer to pre-populate all students who ever took this class from the *entire* `attendances` list,
        // so we see empty checkboxes for them this week.
        
        attendances.forEach(att => {
            const classKey = (role === 'ADMIN' || role === 'OWNER') && att.enrollment.instructor
                ? `${att.enrollment.subjectName} (강사: ${att.enrollment.instructor.name})`
                : att.enrollment.subjectName;

            if (!classStats[classKey]) {
                classStats[classKey] = {};
            }

            const studentId = att.enrollment.student.id;
            if (!classStats[classKey][studentId]) {
                 classStats[classKey][studentId] = {
                     enrollment: att.enrollment,
                     records: {},
                     weeklyTotal: 0
                 }
            }
        });

        // Step 3: Populate weekly attendance matrix
        weeklyAttendances.forEach(att => {
            const classKey = (role === 'ADMIN' || role === 'OWNER') && att.enrollment.instructor
                ? `${att.enrollment.subjectName} (강사: ${att.enrollment.instructor.name})`
                : att.enrollment.subjectName;
            
            const studentId = att.enrollment.student.id;
            const matrix = classStats[classKey][studentId];
            
            const dateStr = format(new Date(att.date), 'yyyy-MM-dd');
            if(!matrix.records[dateStr]) matrix.records[dateStr] = [];
            
            matrix.records[dateStr].push(att);
            
            // Count "PRESENT" and "EXCUSED(공결)" towards weekly total
            if (att.status === 'PRESENT' || att.status === 'EXCUSED') {
                matrix.weeklyTotal += 1;
            }
        });


        // Step 4: Convert to array and sort
        const sortedClasses = Object.entries(classStats).map(([className, studentMap]) => {
            const students = Object.values(studentMap).sort((a, b) => a.enrollment.student.name.localeCompare(b.enrollment.student.name));
            return {
                className,
                students
            };
        }).sort((a, b) => a.className.localeCompare(b.className));

        return sortedClasses;
    }, [attendances, weekInterval, role]);

    const [attendanceToDelete, setAttendanceToDelete] = useState<AttendanceData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!attendanceToDelete) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/attendance/${attendanceToDelete.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "삭제에 실패했습니다.");
            }

            setAttendanceToDelete(null);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("삭제 중 오류가 발생했습니다.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (attendances.length === 0) {
        return (
            <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center">
                <p className="text-slate-500">등록된 전체 출결 기록이 없습니다.</p>
            </div>
        );
    }

    // Helper to render status styling inside the table cell
    const renderStatusBadge = (records: AttendanceData[]) => {
        if (!records || records.length === 0) return <span className="text-slate-300">-</span>;
        
        return (
            <div className="flex flex-col gap-1 items-center justify-center">
                {records.map(att => (
                     <div key={att.id} className="relative group flex items-center justify-center">
                         {att.status === 'PRESENT' && <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold border border-emerald-200 shadow-sm cursor-help" title="출석">◯</span>}
                         {att.status === 'ABSENT' && <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold border border-red-200 shadow-sm cursor-help" title="무단 결석">❌</span>}
                         {att.status === 'EXCUSED' && <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold border border-amber-200 shadow-sm cursor-help" title="공결(출석인정)">△</span>}
                         
                         {/* Tooltip for deletion */}
                         <div className="hidden group-hover:flex absolute z-10 bottom-full mb-1 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg items-center gap-2 whitespace-nowrap">
                            <span>{format(new Date(att.date), 'HH:mm')}</span>
                            {(role === 'OWNER' || role === 'ADMIN' || att.creatorId === currentUserId) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setAttendanceToDelete(att); }}
                                    className="p-1 text-slate-300 hover:text-red-400 bg-slate-700/50 hover:bg-slate-700 rounded transition-colors focus:outline-none"
                                    title="이 기록 삭제"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                         </div>
                     </div>
                ))}
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {/* Header and Filter */}
            <div className="p-4 sm:px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-medium text-slate-900 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    주간 출결 현황 보드
                </h3>
                <div className="flex items-center space-x-3 bg-white border border-slate-300 rounded-lg p-1 shadow-sm">
                    <button onClick={handlePrevWeek} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-sm font-semibold text-slate-800 px-2 select-none min-w-[170px] text-center">
                        {weekTitle}
                    </div>
                    <button onClick={handleNextWeek} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {groupedByClass.length === 0 ? (
                <div className="p-8 text-center bg-white">
                    <p className="text-sm text-slate-500">참여 중인 과목 목록이 없습니다.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100 p-2 sm:p-4 bg-slate-50">
                    {groupedByClass.map(({ className, students }) => (
                        <div key={className} className="mb-6 last:mb-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-100 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800 text-base">{className}</h4>
                                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                    총 {students.length}명
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 table-fixed">
                                    <thead className="bg-slate-50/80">
                                        <tr>
                                            <th rowSpan={2} className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[12%] bg-slate-100/50 align-middle">
                                                학생 이름
                                            </th>
                                            <th rowSpan={2} className="px-2 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[10%] bg-slate-100/50 align-middle">
                                                누적<br/><span className="text-[10px] font-normal text-slate-500">(당월 통계)</span>
                                            </th>
                                            {/* Date headers for Mon ~ Sun */}
                                            {weekDays.map(day => (
                                                <th key={format(day, 'yyyy-MM-dd')} className={`px-2 py-1.5 text-center text-xs font-medium border-b border-slate-200 border-r last:border-r-0 ${
                                                    getDay(day) === 0 ? 'text-red-600 bg-red-50/30' : getDay(day) === 6 ? 'text-blue-600 bg-blue-50/30' : 'text-slate-600'
                                                }`}>
                                                    {format(day, 'MM/dd')}
                                                </th>
                                            ))}
                                            <th rowSpan={2} className="px-2 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider border-l border-slate-200 w-[8%] bg-slate-100/50 align-middle">
                                                주간
                                            </th>
                                        </tr>
                                        <tr>
                                            {/* Day names for Mon ~ Sun */}
                                            {weekDays.map(day => (
                                                <th key={`name-${format(day, 'yyyy-MM-dd')}`} className={`px-1 py-1 text-center text-xs border-r border-slate-200 last:border-r-0 ${
                                                    getDay(day) === 0 ? 'text-red-500 font-bold bg-red-50/30' : getDay(day) === 6 ? 'text-blue-500 font-bold bg-blue-50/30' : 'text-slate-500 font-medium'
                                                }`}>
                                                    {['일', '월', '화', '수', '목', '금', '토'][getDay(day)]}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {students.map((studentMatrix) => {
                                            const attended = studentMatrix.enrollment.attendedSessions || 0;
                                            const target = studentMatrix.enrollment.targetSessions || 8;
                                            const isGoalReached = attended >= target && target > 0;

                                            return (
                                                <tr key={studentMatrix.enrollment.student.id} className="hover:bg-blue-50/20 transition-colors">
                                                    {/* Student Name */}
                                                    <td className="px-3 py-3 text-sm font-semibold text-slate-800 border-r border-slate-100 text-center whitespace-nowrap">
                                                        {studentMatrix.enrollment.student.name}
                                                    </td>
                                                    
                                                    {/* Cumulative Month */}
                                                    <td className={`px-2 py-3 text-center font-bold text-sm border-r border-slate-100 ${
                                                        isGoalReached ? 'bg-red-50 text-red-600' : 'text-slate-700'
                                                    }`}>
                                                        {attended} / {target}
                                                    </td>

                                                    {/* Mon ~ Sun Record Cells */}
                                                    {weekDays.map(day => {
                                                        const dateStr = format(day, 'yyyy-MM-dd');
                                                        const records = studentMatrix.records[dateStr];
                                                        const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                                                        return (
                                                            <td key={dateStr} className={`px-1 py-2 text-center border-r border-slate-100 ${isWeekend ? 'bg-slate-50/30' : ''}`}>
                                                                {renderStatusBadge(records)}
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Weekly Total */}
                                                    <td className="px-2 py-3 text-center text-sm font-bold text-blue-600 border-l border-slate-100 bg-blue-50/10">
                                                        {studentMatrix.weeklyTotal}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {attendanceToDelete && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-6 mx-auto">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">출결 기록 삭제</h3>
                                <p className="text-sm text-slate-500 text-balance">
                                    <span className="font-semibold text-slate-900">{format(new Date(attendanceToDelete.date), 'MM월 dd일 HH:mm')}</span>에 기록된<br />
                                    <span className="font-semibold text-slate-900">{attendanceToDelete.enrollment.student.name}</span> 학생의 출결 기록을 삭제하시겠습니까?<br />
                                    이 작업은 되돌릴 수 없으며, 이번 달 <span className="text-red-600 font-medium">출석 및 이월 회차 계산에 자동 반영됩니다.</span>
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end sm:space-x-3 gap-3 sm:gap-0">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setAttendanceToDelete(null)}
                                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDelete}
                                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none transition-colors"
                            >
                                {isDeleting ? "삭제 중..." : "위험성 확인 및 삭제"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
