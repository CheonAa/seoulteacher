"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Save, Users, Plus, X } from "lucide-react";
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
        
        // If editing, only show the enrollment we are editing
        const enrollmentsToDisplay = isEdit && initialData 
            ? enrollments.filter(e => e.id === initialData.enrollmentId)
            : enrollments;

        enrollmentsToDisplay.forEach(enr => {
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
    }, [enrollments, isEdit, initialData]);

    const getInitialDateStr = (initDate?: any) => {
        if (initDate) return format(new Date(initDate), "yyyy-MM-dd'T'HH:mm");
        const now = new Date();
        const minutes = now.getMinutes();
        now.setMinutes(Math.round(minutes / 10) * 10);
        return format(now, "yyyy-MM-dd'T'HH:mm");
    };

    // Form data for dates
    const [dates, setDates] = useState<string[]>([getInitialDateStr(initialData?.date)]);

    const handleAddDate = () => {
        setDates([...dates, getInitialDateStr()]);
    };

    const handleRemoveDate = (index: number) => {
        const newDates = dates.filter((_, i) => i !== index);
        setDates(newDates);
    };

    const handleDateChange = (index: number, value: string) => {
        const newDates = [...dates];
        newDates[index] = value;
        setDates(newDates);
    };

    // Holds { [enrollmentId]: "PRESENT" | "ABSENT" | "EXCUSED" }
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>(
        initialData ? { [initialData.enrollmentId]: initialData.status === 'SICK' ? 'EXCUSED' : initialData.status } : {}
    );


    const handleBulkPresent = (className: string) => {
        const cls = classes.find(c => c.name === className);
        if (cls) {
            setAttendanceRecords(prev => {
                const newRecords = { ...prev };
                cls.students.forEach(student => {
                    newRecords[student.id] = "PRESENT";
                });
                return newRecords;
            });
        }
    };

    const handleRecordChange = (enrollmentId: string, status: string) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [enrollmentId]: status
        }));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const recordsPayload = Object.entries(attendanceRecords)
            .filter(([_, status]) => status !== "")
            .map(([enrollmentId, status]) => ({ enrollmentId, status }));

        if (recordsPayload.length === 0) {
            setError("출결 상태를 선택한 학생이 없습니다. 최소 1명 이상의 출결을 입력해주세요.");
            return;
        }
        
        if (dates.some(d => !d)) {
            setError("모든 날짜 및 시간을 입력해주세요.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const url = isEdit ? `/api/admin/attendance/${initialData.id}` : "/api/admin/attendance";
            const method = isEdit ? "PUT" : "POST";

            // If editing, we only support one date usually, but we handle the array just in case
            if (isEdit) {
                 const payload = {
                    enrollmentId: recordsPayload[0].enrollmentId,
                    status: recordsPayload[0].status,
                    date: new Date(dates[0]).toISOString()
                 };
                 const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                 });
                 if (!res.ok) {
                     const data = await res.json();
                     throw new Error(data.error || "저장에 실패했습니다.");
                 }
            } else {
                // Submit for each date sequentially or concurrently
                for (const dateStr of dates) {
                     const payload = {
                        date: new Date(dateStr).toISOString(),
                        records: recordsPayload
                     };
                     const res = await fetch(url, {
                        method,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                     });
                     if (!res.ok) {
                         const data = await res.json();
                         throw new Error(`(${dateStr}) ${data.error || "저장에 실패했습니다."}`);
                     }
                }
            }

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
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                    <h3 className="text-lg font-medium text-slate-900">
                        일괄 출결 등록
                    </h3>
                    {!isEdit && (
                        <button
                            type="button"
                            onClick={handleAddDate}
                            className="inline-flex items-center px-3 py-1.5 border border-blue-200 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            날짜 추가
                        </button>
                    )}
                </div>
                
                <div className="space-y-3">
                     {dates.map((dateStr, index) => {
                         const [dDate, dTime] = dateStr.split('T');
                         const tTime = dTime ? dTime.substring(0, 5) : '14:00';
                         
                         return (
                             <div key={index} className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-xl relative pb-5 sm:pb-0">
                                <div className="flex-1 flex gap-2">
                                    <div className="w-1/2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">날짜 <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            required
                                            value={dDate}
                                            onChange={(e) => handleDateChange(index, `${e.target.value}T${tTime}`)}
                                            className="block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div className="w-1/2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">시간 <span className="text-red-500">*</span></label>
                                        <select
                                            required
                                            value={tTime}
                                            onChange={(e) => handleDateChange(index, `${dDate}T${e.target.value}`)}
                                            className="block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        >
                                            {Array.from({ length: 24 * 6 }).map((_, i) => {
                                                const h = Math.floor(i / 6);
                                                const m = (i % 6) * 10;
                                                const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                                const ampm = h >= 12 ? '오후' : '오전';
                                                const displayH = h % 12 === 0 ? 12 : h % 12;
                                                const displayVal = `${ampm} ${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                                return <option key={val} value={val}>{displayVal}</option>;
                                            })}
                                        </select>
                                    </div>
                                    {index === dates.length - 1 && (
                                         <p className="absolute -bottom-5 left-0 text-xs text-slate-500 whitespace-nowrap">날짜 추가 버튼을 눌러 여러 번의 수업을 한 번에 등록할 수 있습니다.</p>
                                    )}
                                </div>
                                {dates.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveDate(index)}
                                        className="mb-0 sm:mb-[2px] p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="날짜 삭제"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                             </div>
                         );
                     })}
                </div>
            </div>

            <div className="space-y-8">
                {classes.length === 0 ? (
                    <p className="text-slate-500 text-sm">등록 가능한 수강생이 없습니다.</p>
                ) : (
                    classes.map(cls => (
                        <div key={cls.name} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <h4 className="font-semibold text-slate-800 text-base flex items-center">
                                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                                    {cls.name} <span className="ml-2 text-sm font-normal text-slate-500">({cls.students.length}명)</span>
                               </h4>
                               <button
                                    type="button"
                                    onClick={() => handleBulkPresent(cls.name)}
                                    className="inline-flex items-center px-3 py-1.5 border border-emerald-200 text-xs font-medium rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                               >
                                  ✅ 이 반 출석 일괄 적용
                               </button>
                            </div>
                            
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/2">
                                            학생 이름 / 수강 과목
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/2">
                                            출결 상태
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {cls.students.map(student => (
                                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-900">{student.student.name}</span>
                                                    <span className="text-xs text-slate-500 mt-0.5">{student.subjectName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                <select
                                                    value={attendanceRecords[student.id] || ""}
                                                    onChange={(e) => handleRecordChange(student.id, e.target.value)}
                                                    className={`block w-full border font-medium rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                                                        !attendanceRecords[student.id] ? 'bg-white text-slate-500 border-slate-300' :
                                                        attendanceRecords[student.id] === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        attendanceRecords[student.id] === 'ABSENT' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}
                                                >
                                                    <option value="">선택해주세요</option>
                                                    <option value="PRESENT">✅ 출석</option>
                                                    <option value="ABSENT">❌ 결석 (무단)</option>
                                                    <option value="EXCUSED">➖ 공결(병결)</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))
                )}
                {classes.length > 0 && (
                    <p className="text-xs text-slate-500 text-right mt-2">
                        ⚠ '선택해주세요' 상태인 학생은 기록이 저장되지 않습니다. '출석'으로 표시된 학생들만 이번 달 회차가 차감됩니다.
                    </p>
                )}
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
                            {isEdit ? "변경사항 확인" : "출결 등록 완료"}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
