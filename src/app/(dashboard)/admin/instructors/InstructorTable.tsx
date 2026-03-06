"use client";

import { useState } from "react";
import { Search, Edit2, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    creatorId: string | null;
};

export default function InstructorTable({ initialInstructors, currentUserId, currentUserRole }: { initialInstructors: InstructorData[], currentUserId: string, currentUserRole: string }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");

    // Delete state
    const [instructorToDelete, setInstructorToDelete] = useState<InstructorData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredInstructors = initialInstructors.filter(instructor =>
        instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instructor.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async () => {
        if (!instructorToDelete) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/instructors/${instructorToDelete.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "삭제에 실패했습니다.");
            }

            setInstructorToDelete(null);
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
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">관리</th>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            {(currentUserRole === 'OWNER' || instructor.id === currentUserId || instructor.creatorId === currentUserId) && (
                                                <Link
                                                    href={`/admin/instructors/${instructor.id}/edit`}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    title="수정"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Link>
                                            )}
                                            {(currentUserRole === 'OWNER' || instructor.creatorId === currentUserId) && (
                                                <button
                                                    onClick={() => setInstructorToDelete(instructor)}
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
            {instructorToDelete && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-6 mx-auto">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">강사 데이터 삭제</h3>
                                <p className="text-sm text-slate-500 text-balance">
                                    <span className="font-semibold text-slate-900">{instructorToDelete.name}</span> 강사의 계정을 완전히 삭제하시겠습니까?<br />
                                    <span className="text-red-600 font-medium">주의: 담당 수강생들의 정보가 함께 삭제될 수 있으므로 다른 강사로 인계 후 삭제하는 것을 권장합니다. </span>
                                    이 작업은 되돌릴 수 없습니다.
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end sm:space-x-3 gap-3 sm:gap-0">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setInstructorToDelete(null)}
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
