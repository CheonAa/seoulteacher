"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { format } from "date-fns";

type EnrollmentDetails = {
    id: string;
    subjectName: string;
    student: { name: string };
    instructor: { name: string };
};

export default function AttendanceForm({ enrollments }: { enrollments: EnrollmentDetails[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        enrollmentId: enrollments.length > 0 ? enrollments[0].id : "",
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        status: "PRESENT",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/admin/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    enrollmentId: formData.enrollmentId,
                    date: new Date(formData.date).toISOString(),
                    status: formData.status,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "출결 등록에 실패했습니다.");

            router.push("/admin/attendance");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div>
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">
                    결석/출석 수동 기록
                </h3>
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">학생 및 수강 과목 선택 <span className="text-red-500">*</span></label>
                        <select
                            name="enrollmentId"
                            required
                            value={formData.enrollmentId}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="" disabled>수강 정보를 선택하세요</option>
                            {enrollments.map(enr => (
                                <option key={enr.id} value={enr.id}>
                                    {enr.student.name} - {enr.subjectName} (강사: {enr.instructor.name})
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">출결을 기록할 학생의 해당 과목을 선택해주세요.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">날짜 및 시간 <span className="text-red-500">*</span></label>
                            <input
                                type="datetime-local"
                                name="date"
                                required
                                value={formData.date}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">출결 상태 <span className="text-red-500">*</span></label>
                            <select
                                name="status"
                                required
                                value={formData.status}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="PRESENT">출석 (PRESENT) - 회차 정상 차감</option>
                                <option value="ABSENT">결석 (ABSENT) - 무단 결석 (회차 미차감)</option>
                                <option value="EXCUSED">병결/공결 (EXCUSED) - 회차 미차감</option>
                            </select>
                            <p className="mt-1 text-xs text-slate-500">⚠ '출석'으로 기록할 때만 이번 달 출석 및 이월 회차가 차감됩니다.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    취소
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                >
                    {loading ? (
                        <>저장 중...</>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            기록하기
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
