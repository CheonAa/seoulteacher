"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { format } from "date-fns";

type InstructorAttendanceData = {
    id: string;
    date: Date;
    status: string;
    method: string;
    enrollment: {
        subjectName: string;
        student: { name: string; school: string | null; grade: string | null };
    };
};

export default function InstructorAttendanceTable({ initialAttendances }: { initialAttendances: InstructorAttendanceData[] }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredAttendances = initialAttendances.filter(att =>
        att.enrollment.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        att.enrollment.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col w-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative w-full max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="학생 이름 또는 과목명으로 검색..."
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">학생 이름 (학교/학년)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">수강 과목</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">방법</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredAttendances.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    {searchTerm ? '검색 결과가 없습니다.' : '담당한 수업의 출결 기록이 없습니다.'}
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
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {att.enrollment.student.school || '-'}
                                            {att.enrollment.student.grade ? ` / ${att.enrollment.student.grade}학년` : ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-700">{att.enrollment.subjectName}</div>
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
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
