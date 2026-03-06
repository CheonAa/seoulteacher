"use client";

import { useState } from "react";
import { Search, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AttendanceData = {
    id: string;
    date: Date;
    status: string;
    method: string;
    enrollment: {
        subjectName: string;
        student: { name: string };
        instructor: { name: string };
    };
    creatorId: string | null;
};

export default function AttendanceTable({ initialAttendances, currentUserId, currentUserRole }: { initialAttendances: AttendanceData[], currentUserId: string, currentUserRole: string }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");

    // Delete state
    const [attendanceToDelete, setAttendanceToDelete] = useState<AttendanceData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredAttendances = initialAttendances.filter(att =>
        att.enrollment.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        att.enrollment.instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        att.enrollment.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    return (
        <div className="flex flex-col w-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative w-full max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="학생, 강사 또는 과목 이름으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">출석 일시</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">학생 이름</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">과목 및 강사</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">방법</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredAttendances.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    {searchTerm ? '검색 결과가 없습니다.' : '출결 기록이 없습니다.'}
                                </td>
                            </tr>
                        ) : (
                            filteredAttendances.map((att) => (
                                <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{format(new Date(att.date), 'yyyy-MM-dd HH:mm')}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900 font-medium">{att.enrollment.student.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-700">{att.enrollment.subjectName}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{att.enrollment.instructor.name} 강사</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${att.status === 'PRESENT' ? 'bg-blue-100 text-blue-800' :
                                            att.status === 'ABSENT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                                            }`}>
                                            {att.status === 'PRESENT' ? '출석' : att.status === 'ABSENT' ? '결석' : att.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${att.method === 'QR_SCAN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {att.method === 'QR_SCAN' ? 'QR 스캔' : '수동 입력'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            {(currentUserRole === 'OWNER' || att.creatorId === currentUserId) && (
                                                <Link
                                                    href={`/admin/attendance/${att.id}/edit`}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    title="수정"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Link>
                                            )}
                                            {(currentUserRole === 'OWNER' || att.creatorId === currentUserId) && (
                                                <button
                                                    onClick={() => setAttendanceToDelete(att)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
                                    <span className="font-semibold text-slate-900">{format(new Date(attendanceToDelete.date), 'MM월 dd일')}</span>에 기록된<br />
                                    <span className="font-semibold font-slate-900">{attendanceToDelete.enrollment.student.name}</span> 학생의 출결 기록을 삭제하시겠습니까?<br />
                                    이 작업은 되돌릴 수 없으며, 이번 달의 <span className="text-red-600 font-medium">출석 및 이월 회차 계산에 영향을 줄 수 있습니다.</span>
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end sm:space-x-3 gap-3 sm:gap-0">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setAttendanceToDelete(null)}
                                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDelete}
                                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
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
