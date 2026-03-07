"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Users, Edit2, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AttendanceData = {
    id: string;
    date: Date;
    status: string;
    method: string;
    creatorId: string | null;
    enrollment: {
        id: string;
        subjectName: string;
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

    // Group records exclusively by the formatted Date string (e.g. "2024-03-24")
    const groupedByDate = useMemo(() => {
        const groups: Record<string, AttendanceData[]> = {};
        attendances.forEach(att => {
            const dateStr = format(new Date(att.date), 'yyyy-MM-dd');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(att);
        });
        return groups;
    }, [attendances]);

    const availableDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
    const [selectedDate, setSelectedDate] = useState<string>(availableDates[0] || format(new Date(), 'yyyy-MM-dd'));

    const currentRecords = groupedByDate[selectedDate] || [];

    // Under that date, group by Class/Subject
    const groupedByClass = useMemo(() => {
        const classStats: Record<string, AttendanceData[]> = {};
        currentRecords.forEach(att => {
            const classKey = (role === 'ADMIN' || role === 'OWNER') && att.enrollment.instructor
                ? `${att.enrollment.subjectName} (강사: ${att.enrollment.instructor.name})`
                : att.enrollment.subjectName;

            if (!classStats[classKey]) {
                classStats[classKey] = [];
            }
            classStats[classKey].push(att);
        });

        // Sort students within classes by Name
        for (const key in classStats) {
            classStats[key].sort((a, b) => a.enrollment.student.name.localeCompare(b.enrollment.student.name));
        }

        return Object.entries(classStats).sort((a, b) => a[0].localeCompare(b[0]));
    }, [currentRecords, role]);

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
                <p className="text-slate-500">등록된 출결 기록이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {/* Header and Filter */}
            <div className="p-4 sm:px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-medium text-slate-900 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    과목별 학생 출석 명부 (Roster)
                </h3>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-700 whitespace-nowrap">조회 날짜:</label>
                    <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-white border border-slate-300 text-slate-900 text-sm font-medium rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none shadow-sm min-w-[140px]"
                    >
                        {availableDates.length > 0 ? availableDates.map(d => (
                            <option key={d} value={d}>{d}</option>
                        )) : (
                            <option value={selectedDate}>{selectedDate}</option>
                        )}
                    </select>
                </div>
            </div>

            {groupedByClass.length === 0 ? (
                <div className="p-8 text-center bg-white">
                    <p className="text-sm text-slate-500">선택하신 날짜({selectedDate})의 출결 기록이 없습니다.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100 p-2 sm:p-4 bg-slate-50">
                    {groupedByClass.map(([className, classAttendances]) => (
                        <div key={className} className="mb-6 last:mb-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-100 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800 text-base">{className}</h4>
                                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                    총 {classAttendances.length}명
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50/80">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[25%]">학생 이름</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%]">상태</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상세 시간</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">기록 방식</th>
                                            <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-[10%]">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {classAttendances.map(att => (
                                            <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-slate-900">{att.enrollment.student.name}</div>
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-md ${att.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                        att.status === 'ABSENT' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        }`}>
                                                        {att.status === 'PRESENT' ? '✅ 출석' : att.status === 'ABSENT' ? '❌ 무단결석' : '➖ 공/병결'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-600 font-medium">
                                                    {format(new Date(att.date), 'HH:mm (a)')}
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-500 hidden sm:table-cell">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${att.method === 'QR_SCAN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {att.method === 'QR_SCAN' ? 'QR 스캔' : '수동 입력'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        {(role === 'OWNER' || att.creatorId === currentUserId) && (
                                                            <Link
                                                                href={`/admin/attendance/${att.id}/edit`}
                                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                                title="수정"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Link>
                                                        )}
                                                        {(role === 'OWNER' || role === 'ADMIN' || att.creatorId === currentUserId) && (
                                                            <button
                                                                onClick={() => setAttendanceToDelete(att)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                                                title="삭제"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
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
