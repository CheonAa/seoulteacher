"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Save, Users } from "lucide-react";
import { format } from "date-fns";

type EnrollmentDetails = {
    id: string;
    subjectName: string;
    student: { name: string };
    instructor: { name: string };
};

export default function AttendanceForm({ enrollments, initialData, isEdit = false }: {
    enrollments: EnrollmentDetails[],
    initialData?: any,
    isEdit?: boolean
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Group enrollments into classes
    const classes = useMemo(() => {
        const classMap = new Map<string, EnrollmentDetails[]>();
        enrollments.forEach(enr => {
            const className = `${enr.subjectName} (강사: ${enr.instructor.name})`;
            if (!classMap.has(className)) {
                classMap.set(className, []);
            }
            classMap.get(className)!.push(enr);
        });
        return Array.from(classMap.entries()).map(([name, students]) => ({
            name,
            students
        }));
    }, [enrollments]);

    const [selectedClass, setSelectedClass] = useState<string>("");

    // Default form data
    const [formData, setFormData] = useState({
        date: initialData?.date ? format(new Date(initialData.date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    });

    // Holds { [enrollmentId]: "PRESENT" | "ABSENT" | "EXCUSED" }
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});

    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const className = e.target.value;
        setSelectedClass(className);

        // Reset records to default to "PRESENT" for all students in the class
        const cls = classes.find(c => c.name === className);
        if (cls) {
            const newRecords: Record<string, string> = {};
            cls.students.forEach(student => {
                newRecords[student.id] = "PRESENT"; // Default
            });
            setAttendanceRecords(newRecords);
        }
    };

    const handleRecordChange = (enrollmentId: string, status: string) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [enrollmentId]: status
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedClass) {
            setError("반 정보를 선택해주세요.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const url = isEdit ? `/api/admin/attendance/${initialData.id}` : "/api/admin/attendance";
            const method = isEdit ? "PUT" : "POST";

            // Convert to array payload
            const recordsPayload = Object.entries(attendanceRecords).map(([enrollmentId, status]) => ({
                enrollmentId,
                status
            }));

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: new Date(formData.date).toISOString(),
                    records: recordsPayload
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");

            router.push("/admin/attendance");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const currentClassStudents = classes.find(c => c.name === selectedClass)?.students || [];

    return (
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div>
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">
                    출결 일괄 등록
                </h3>
                <div className="grid grid-cols-1 gap-6">
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
                            <label className="block text-sm font-medium text-slate-700">과목 및 강사 선택 <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={selectedClass}
                                onChange={handleClassChange}
                                className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-sm"
                            >
                                <option value="" disabled>확인할 과목을 선택하세요</option>
                                {classes.map(cls => (
                                    <option key={cls.name} value={cls.name}>
                                        {cls.name} ({cls.students.length}명)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {selectedClass && currentClassStudents.length > 0 && (
                <div>
                    <h3 className="text-[15px] font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-600" />
                        학생 출결 체크 (결석 학생만 변경)
                    </h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        학생 이름
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-64">
                                        출결 상태
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {currentClassStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {student.student.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            <select
                                                value={attendanceRecords[student.id] || "PRESENT"}
                                                onChange={(e) => handleRecordChange(student.id, e.target.value)}
                                                className={`mt-1 block w-full border font-medium rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${attendanceRecords[student.id] === 'PRESENT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        attendanceRecords[student.id] === 'ABSENT' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                    }`}
                                            >
                                                <option value="PRESENT">✅ 출석</option>
                                                <option value="ABSENT">❌ 결석 (무단)</option>
                                                <option value="EXCUSED">➖ 공결/병결</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 text-right">⚠ '출석'으로 표시된 학생들만 이번 달 회차가 차감됩니다.</p>
                </div>
            )}

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
                    disabled={loading || !selectedClass}
                    className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                >
                    {loading ? (
                        <>저장 중...</>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            {isEdit ? "변경사항 확인" : "일괄 등록 확인"}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
