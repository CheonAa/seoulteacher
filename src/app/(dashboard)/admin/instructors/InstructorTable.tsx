"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type InstructorData = {
    id: string;
    name: string;
    email: string;
    instructorProfile: {
        baseRate: number;
        insuranceFee: number;
        bankAccountVND: string | null;
        bankAccountKRW: string | null;
    } | null;
    _count: {
        enrollments: number;
    };
};

export default function InstructorTable({ initialInstructors }: { initialInstructors: InstructorData[] }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredInstructors = initialInstructors.filter(instructor =>
        instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instructor.email.toLowerCase().includes(searchTerm.toLowerCase())
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
                        placeholder="이름 또는 이메일로 검색..."
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">이름 / 이메일</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">수익 비율</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">보험료 공제액</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">계좌 정보 (VND / KRW)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">담당 수강생 수</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredInstructors.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    {searchTerm ? '검색 결과가 없습니다.' : '등록된 강사가 없습니다.'}
                                </td>
                            </tr>
                        ) : (
                            filteredInstructors.map((instructor) => (
                                <tr key={instructor.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{instructor.name}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{instructor.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {instructor.instructorProfile ? `${(instructor.instructorProfile.baseRate * 100).toFixed(0)}%` : '미설정'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {instructor.instructorProfile?.insuranceFee.toLocaleString()} VND
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit border border-slate-200">
                                                <span className="font-semibold text-slate-500 mr-1">VND:</span>
                                                {instructor.instructorProfile?.bankAccountVND || '-'}
                                            </span>
                                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit border border-slate-200">
                                                <span className="font-semibold text-slate-500 mr-1">KRW:</span>
                                                {instructor.instructorProfile?.bankAccountKRW || '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                                        {instructor._count.enrollments} 명
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
