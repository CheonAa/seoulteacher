"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Calculator, Plus, Trash2, ArrowRightLeft, PlayCircle, X } from "lucide-react";

type Instructor = {
    id: string;
    name: string;
    email: string;
};

export default function StudentForm({ instructors, initialData, isEdit = false }: {
    instructors: Instructor[],
    initialData?: any,
    isEdit?: boolean
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [parents, setParents] = useState(initialData?.parents && initialData.parents.length > 0
        ? initialData.parents
        : [{ name: "", phone: "", relation: "Mother" }]
    );

    const [enrollments, setEnrollments] = useState<any[]>(initialData?.enrollments && initialData.enrollments.length > 0
        ? initialData.enrollments.map((enr: any) => ({
            id: enr.id || "",
            instructorId: enr.instructorId || (instructors.length > 0 ? instructors[0].id : ""),
            subjectName: enr.subjectName || "",
            curriculum: enr.curriculum || "KOREAN",
            period: enr.period || "SEMESTER",
            gradeGroup: enr.gradeGroup || "ELEM",
            feePerSession: String(enr.feePerSession || "875000"),
            targetSessionsMonth: String(enr.targetSessionsMonth || "8"),
            depositorName: enr.depositorName || "",
            status: enr.status || "ACTIVE",
            startDate: enr.startDate ? new Date(enr.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            pausedReason: enr.pausedReason || null,
        }))
        : [{
            id: "",
            instructorId: instructors.length > 0 ? instructors[0].id : "",
            subjectName: "",
            curriculum: "KOREAN",
            period: "SEMESTER",
            gradeGroup: "ELEM",
            feePerSession: "875000",
            targetSessionsMonth: "8",
            depositorName: "",
            status: "ACTIVE",
            startDate: new Date().toISOString().split('T')[0],
            pausedReason: null,
        }]
    );

    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        gender: initialData?.gender || "M",
        school: initialData?.school || "",
        grade: initialData?.grade || "",
        phone: initialData?.phone || "",
        shuttleStatus: initialData?.shuttleStatus || "NOT_BOARDING",
        shuttleLocation: initialData?.shuttleLocation || "",
    });

    const calculateFee = (curriculum: string, period: string, gradeGroup: string, sessions: number) => {
        let fee = 0;
        if (curriculum === 'KOREAN') {
            if (period === 'SEMESTER') {
                if (gradeGroup === 'ELEM') {
                    if (sessions === 8) fee = 7000000;
                    else if (sessions === 12) fee = 9400000;
                } else if (gradeGroup === 'MID') {
                    if (sessions === 8) fee = 7500000;
                    else if (sessions === 12) fee = 10500000;
                } else if (gradeGroup === 'HIGH') {
                    if (sessions === 8) fee = 8000000;
                    else if (sessions === 12) fee = 11000000;
                }
            } else if (period === 'VACATION') {
                if (gradeGroup === 'ELEM') {
                    if (sessions === 12) fee = 9400000;
                    else if (sessions === 18) fee = 14100000;
                    else if (sessions === 24) fee = 15980000;
                    else if (sessions === 30) fee = 18800000;
                } else if (gradeGroup === 'MID') {
                    if (sessions === 12) fee = 10500000;
                    else if (sessions === 18) fee = 15750000;
                    else if (sessions === 24) fee = 17850000;
                    else if (sessions === 30) fee = 21000000;
                } else if (gradeGroup === 'HIGH') {
                    if (sessions === 12) fee = 11000000;
                    else if (sessions === 18) fee = 16500000;
                    else if (sessions === 24) fee = 18700000;
                    else if (sessions === 30) fee = 22000000;
                }
            }
        } else if (curriculum === 'INTERNATIONAL') {
            const base8 = gradeGroup === 'G7_9' ? 11000000 : 12500000;
            const perSession = base8 / 8;
            if (period === 'SEMESTER') {
                if (sessions === 8) fee = base8;
            } else if (period === 'VACATION') {
                if (sessions === 12) fee = (base8 + (4 * perSession)) * 0.9;
                else if (sessions === 20) fee = (base8 + (12 * perSession)) * 0.8;
            }
        }

        if (fee > 0) {
            return fee;
        }
        return 0; // Or keep manual fee if calculation doesn't match predefined rules
    };

    // Auto-recalculate feePerSession when relevant fields change for an enrollment
    const handleEnrollmentChange = (index: number, field: string, value: string) => {
        setEnrollments(prev => {
            const newEnrollments = [...prev];
            const targetEnr = { ...newEnrollments[index], [field]: value };
            
            // Adjust dependent values automatically (like the old calc effect did)
            if (field === 'curriculum') {
                targetEnr.gradeGroup = value === 'KOREAN' ? 'ELEM' : 'G7_9';
                targetEnr.targetSessionsMonth = "8";
                targetEnr.period = "SEMESTER";
            } else if (field === 'period') {
                targetEnr.targetSessionsMonth = value === 'SEMESTER' ? "8" : "12";
            }
            
            // Try to auto-calculate the fee with updated fields
            if (['curriculum', 'period', 'gradeGroup', 'targetSessionsMonth'].includes(field) || field === 'curriculum') {
                const sessions = Number(targetEnr.targetSessionsMonth) || 1;
                const totalFee = calculateFee(targetEnr.curriculum, targetEnr.period, targetEnr.gradeGroup, sessions);
                if (totalFee > 0) {
                     // 총 금액에서 나누어 제시하되 천 단위 절삭 없이 정확히 할당
                     targetEnr.feePerSession = String(Math.round(totalFee / sessions));
                }
            }
            
            newEnrollments[index] = targetEnr;
            return newEnrollments;
        });
    };

    const handleParentChange = (index: number, field: string, value: string) => {
        const newParents = [...parents];
        newParents[index] = { ...newParents[index], [field]: value };
        setParents(newParents);
    };

    const addParent = () => {
        setParents([...parents, { name: "", phone: "", relation: "Father" }]);
    };

    const removeParent = (index: number) => {
        const newParents = parents.filter((_: any, i: number) => i !== index);
        setParents(newParents);
    };

    const addEnrollment = () => {
        setEnrollments([...enrollments, {
            id: "", // Empty ID for new enrollments
            instructorId: instructors.length > 0 ? instructors[0].id : "",
            subjectName: "",
            curriculum: "KOREAN",
            period: "SEMESTER",
            gradeGroup: "ELEM",
            feePerSession: "875000",
            targetSessionsMonth: "8",
            depositorName: "",
            status: "ACTIVE",
            startDate: new Date().toISOString().split('T')[0],
            pausedReason: null,
        }]);
    };

    const removeEnrollment = (index: number) => {
        const newEnrollments = enrollments.filter((_: any, i: number) => i !== index);
        setEnrollments(newEnrollments);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const url = isEdit ? `/api/admin/students/${initialData.id}` : "/api/admin/students";
            const method = isEdit ? "PUT" : "POST";

            const processedEnrollments = enrollments.map(enr => ({
                id: enr.id,
                instructorId: enr.instructorId,
                subjectName: enr.subjectName,
                curriculum: enr.curriculum,
                period: enr.period,
                gradeGroup: enr.gradeGroup,
                feePerSession: Math.round(Number(enr.feePerSession)),
                targetSessionsMonth: Number(enr.targetSessionsMonth),
                depositorName: enr.depositorName || null,
                status: enr.status,
                startDate: enr.startDate,
                pausedReason: enr.pausedReason
            }));

            const payload = {
                ...formData,
                parents: parents.filter((p: any) => p.name.trim() !== "" && p.phone.trim() !== ""),
                enrollments: processedEnrollments,
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");

            router.push("/admin/students");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const [transitioningIndex, setTransitioningIndex] = useState<number | null>(null);
    const [resumingIndex, setResumingIndex] = useState<number | null>(null);

    const handleTransition = async (index: number) => {
        const enr = enrollments[index];
        if (!enr.id) {
            alert("저장되지 않은 수강 정보는 전환할 수 없습니다. 먼저 저장하세요.");
            return;
        }

        if (confirm("기존 수강을 일시 중단하고 이월 회차를 포함하여 동일 과목의 특강으로 전환하시겠습니까?")) {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/enrollment/${enr.id}/transition`, {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        subjectName: enr.subjectName,
                        feePerSession: Number(enr.feePerSession),
                        targetSessionsMonth: Number(enr.targetSessionsMonth),
                        depositorName: enr.depositorName,
                        startDate: new Date().toISOString().split('T')[0]
                    })
                });
                
                if (!res.ok) throw new Error("전환 실패");
                alert("성공적으로 특강으로 전환되었습니다.");
                router.refresh();
                window.location.reload();
            } catch (err) {
                alert("오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleResume = async (index: number) => {
        const enr = enrollments[index]; // This is the PAUSED enrollment
        if (!enr.id || enr.status !== "PAUSED") return;

        // Find candidate active enrollments to close (usually the vacation one)
        const activeEnrollments = enrollments.filter(e => e.status === "ACTIVE" && e.id);
        if (activeEnrollments.length === 0) {
            alert("종료하고 이월할 진행 중인 특강을 찾을 수 없습니다.");
            return;
        }

        let vacationEnrollmentId = activeEnrollments[0].id;
        if (activeEnrollments.length > 1) {
            const selected = prompt(
                "여러 진행 중인 수강이 있습니다. 종료할 특강 과목 번호를 입력하세요:\n" + 
                activeEnrollments.map((e, i) => `${i + 1}. ${e.subjectName}`).join("\n")
            );
            if (!selected) return;
            const idx = parseInt(selected) - 1;
            if (activeEnrollments[idx]) vacationEnrollmentId = activeEnrollments[idx].id;
        }

        const resumeDate = prompt("기존 학기 수업 재개 일자를 입력하세요 (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
        if (!resumeDate) return;

        if (confirm("선택한 특강을 종료하고 이월 회차를 가져와 기존 수업을 재개하시겠습니까?")) {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/enrollment/${enr.id}/resume`, {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        vacationEnrollmentId,
                        resumeDate
                    })
                });
                
                if (!res.ok) throw new Error("재개 실패");
                alert("성공적으로 기존 수업이 재개되었습니다.");
                router.refresh();
                window.location.reload();
            } catch (err) {
                alert("오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        }
    }

    return (
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            {/* 1. 수강 등록 정보 (Enrollment) - Moved to TOP */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 mb-4 gap-2">
                    <h3 className="text-lg font-medium text-slate-900">
                        수강 등록 정보 (Enrollment)
                    </h3>
                    <button
                        type="button"
                        onClick={addEnrollment}
                        className="w-full sm:w-auto text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 sm:py-1 rounded-md font-medium transition-colors flex justify-center items-center"
                    >
                        <Plus className="w-4 h-4 inline-block mr-1" />
                        수강 과목 추가
                    </button>
                </div>

                <div className="space-y-6">
                    {enrollments.map((enr: any, index: number) => (
                        <div key={index} className="bg-slate-50 p-5 rounded-lg border border-slate-200 relative">
                            {enrollments.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeEnrollment(index)}
                                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 pb-2 border-b border-slate-200 gap-2 sm:gap-0">
                                <h4 className="text-sm font-semibold text-slate-700 flex flex-wrap items-center gap-2">
                                    수강 정보 {index + 1}
                                    {enr.status === 'PAUSED' && (
                                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 border border-amber-200 text-amber-800">
                                            일시 중단 (특강 전환됨)
                                        </span>
                                    )}
                                    {enr.status === 'CLOSED' && (
                                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 border border-slate-300 text-slate-700">
                                            종료됨
                                        </span>
                                    )}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2">
                                    {enr.id && enr.status === 'ACTIVE' && isEdit && (
                                         <button
                                            type="button"
                                            onClick={() => handleTransition(index)}
                                            className="w-full sm:w-auto justify-center inline-flex items-center px-2.5 py-2 sm:py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                                            title="해당 수강을 일시 중단하고 이월 회차를 새 특강으로 넘깁니다"
                                         >
                                            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> 특강 전환
                                         </button>
                                    )}
                                    {enr.id && enr.status === 'PAUSED' && isEdit && (
                                         <button
                                            type="button"
                                            onClick={() => handleResume(index)}
                                            className="w-full sm:w-auto justify-center inline-flex items-center px-2.5 py-2 sm:py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                                            title="특강을 종료하고 해당 수강을 재개합니다"
                                         >
                                            <PlayCircle className="w-3.5 h-3.5 mr-1" /> 수강 재개
                                         </button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">담당 강사 <span className="text-red-500">*</span></label>
                                    <select
                                        name="instructorId"
                                        required
                                        value={enr.instructorId}
                                        onChange={(e) => handleEnrollmentChange(index, "instructorId", e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    >
                                        <option value="" disabled>강사를 선택하세요</option>
                                        {instructors.map(inst => (
                                            <option key={inst.id} value={inst.id}>{inst.name} ({inst.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">수강 과목 명 <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="subjectName"
                                        required
                                        value={enr.subjectName}
                                        onChange={(e) => handleEnrollmentChange(index, "subjectName", e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="인터수학 기초"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">교육과정</label>
                                    <select
                                        value={enr.curriculum}
                                        onChange={(e) => handleEnrollmentChange(index, 'curriculum', e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    >
                                        <option value="KOREAN">한국 교육과정</option>
                                        <option value="INTERNATIONAL">해외 교육과정</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">기간 (학기/방학)</label>
                                    <select
                                        value={enr.period}
                                        onChange={(e) => handleEnrollmentChange(index, 'period', e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    >
                                        <option value="SEMESTER">학기 중</option>
                                        <option value="VACATION">방학 특강</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">학년/과정</label>
                                    <select
                                        value={enr.gradeGroup}
                                        onChange={(e) => handleEnrollmentChange(index, 'gradeGroup', e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    >
                                        {enr.curriculum === 'KOREAN' ? (
                                            <>
                                                <option value="ELEM">초등</option>
                                                <option value="MID">중등</option>
                                                <option value="HIGH">고등</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="G7_9">7, 8, 9 학년</option>
                                                <option value="G10_12">10, 11, 12 학년</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">목표 회차 (수업 횟수) <span className="text-red-500">*</span></label>
                                    <select
                                        value={enr.targetSessionsMonth}
                                        onChange={(e) => handleEnrollmentChange(index, "targetSessionsMonth", e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    >
                                        {enr.curriculum === 'KOREAN' && enr.period === 'SEMESTER' && (
                                            <>
                                                <option value={8}>8회 기준</option>
                                                <option value={12}>12회 기준</option>
                                            </>
                                        )}
                                        {enr.curriculum === 'KOREAN' && enr.period === 'VACATION' && (
                                            <>
                                                <option value={12}>12회 기준</option>
                                                <option value={18}>18회 기준</option>
                                                <option value={24}>24회 기준 (15% 할인)</option>
                                                <option value={30}>30회 기준 (20% 할인)</option>
                                            </>
                                        )}
                                        {enr.curriculum === 'INTERNATIONAL' && enr.period === 'SEMESTER' && (
                                            <option value={8}>8회 기준</option>
                                        )}
                                        {enr.curriculum === 'INTERNATIONAL' && enr.period === 'VACATION' && (
                                            <>
                                                <option value={12}>12회 기준 (8회+4회, 10%할인)</option>
                                                <option value={20}>20회 기준 (8회+12회, 20%할인)</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">1회차 수강료 (VND) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        name="feePerSession"
                                        required
                                        min="0"
                                        value={enr.feePerSession}
                                        onChange={(e) => handleEnrollmentChange(index, "feePerSession", e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="1562000"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">총 수강료에서 횟수를 나눈 정확한 금액이 입력됩니다.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">시작 일자</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={enr.startDate}
                                        onChange={(e) => handleEnrollmentChange(index, "startDate", e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div className="md:col-span-2 lg:col-span-4">
                                    <label className="block text-sm font-medium text-slate-700">입금자명 (예금주)</label>
                                    <input
                                        type="text"
                                        name="depositorName"
                                        value={enr.depositorName}
                                        onChange={(e) => handleEnrollmentChange(index, "depositorName", e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="학생 또는 학부모 이름"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. 학생 기본 정보 - Moved to Middle */}
            <div>
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">
                    학생 기본 정보
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">이름 <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="홍길동"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">성별</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="M">남 (M)</option>
                            <option value="F">여 (F)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">학교</label>
                        <input
                            type="text"
                            name="school"
                            value={formData.school}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="UNIS"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">학년</label>
                        <input
                            type="text"
                            name="grade"
                            value={formData.grade}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="10"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">연락처</label>
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="010-1234-5678"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">차량 탑승 여부</label>
                        <select
                            name="shuttleStatus"
                            value={formData.shuttleStatus}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="NOT_BOARDING">미탑승</option>
                            <option value="BOARDING">탑승</option>
                        </select>
                    </div>
                    {formData.shuttleStatus === 'BOARDING' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">차량 탑승지</label>
                            <input
                                type="text"
                                name="shuttleLocation"
                                value={formData.shuttleLocation}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Royal City R5 앞"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 3. 학부모 정보 - Moved to Middle */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 mb-4 gap-2">
                    <h3 className="text-lg font-medium text-slate-900">
                        학부모 정보 (Parents)
                    </h3>
                    <button
                        type="button"
                        onClick={addParent}
                        className="w-full sm:w-auto text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 flex justify-center items-center px-3 py-2 sm:py-1 rounded-md font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4 inline-block mr-1" /> 학부모 추가
                    </button>
                </div>

                <div className="space-y-4">
                    {parents.map((parent: any, index: number) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50 p-4 rounded-md border border-slate-200">
                            <div className="flex-1 w-full relative">
                                <label className="block text-sm font-medium text-slate-700">이름</label>
                                <input
                                    type="text"
                                    value={parent.name}
                                    onChange={(e) => handleParentChange(index, "name", e.target.value)}
                                    className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="어머니 이름"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-slate-700">관계</label>
                                <select
                                    value={parent.relation}
                                    onChange={(e) => handleParentChange(index, "relation", e.target.value)}
                                    className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                >
                                    <option value="Mother">어머니 (Mother)</option>
                                    <option value="Father">아버지 (Father)</option>
                                    <option value="Grandparent">조부모 (Grandparent)</option>
                                    <option value="Other">기타 (Other)</option>
                                </select>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-slate-700">연락처</label>
                                <input
                                    type="text"
                                    value={parent.phone}
                                    onChange={(e) => handleParentChange(index, "phone", e.target.value)}
                                    className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="010-1234-5678"
                                />
                            </div>
                            {parents.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeParent(index)}
                                    className="w-full sm:w-auto flex justify-center sm:mb-1 text-red-500 hover:text-red-700 hover:bg-red-50 font-medium text-sm p-2 sm:px-3 bg-white border border-red-200 rounded-md whitespace-nowrap transition-colors"
                                >
                                    삭제
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. 수강료 자동 계산기 요약 - Moved to Bottom and Redesigned as a Summary */}
            <div>
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                    수강료 총 계산 내용
                </h3>
                <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100 mb-6 space-y-4">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-blue-200 text-sm">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-blue-800">과목명</th>
                                    <th className="px-3 py-2 text-left font-semibold text-blue-800">기간</th>
                                    <th className="px-3 py-2 text-left font-semibold text-blue-800">학년</th>
                                    <th className="px-3 py-2 text-left font-semibold text-blue-800">횟수</th>
                                    <th className="px-3 py-2 text-right font-semibold text-blue-800">1회차 수강료</th>
                                    <th className="px-3 py-2 text-center font-semibold text-blue-800">시작 일자</th>
                                    <th className="px-3 py-2 text-left font-semibold text-blue-800">입금자명</th>
                                    <th className="px-3 py-2 text-right font-bold text-blue-900">수강료</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white">
                                {enrollments.map((enr, i) => {
                                    const sessionCount = Number(enr.targetSessionsMonth) || 0;
                                    const feePerSession = Number(enr.feePerSession) || 0;
                                    
                                    // Calculate exact total fee to show instead of multiplying rounded session fee by count
                                    const exactCalculatedFee = calculateFee(enr.curriculum, enr.period, enr.gradeGroup, sessionCount);
                                    
                                    // If user hasn't edited the fee per session manually, show the exact calculated fee
                                    // We can just multiply if they did. But let's assume total tuition = feePerSession * count is mostly fine 
                                    // if we don't truncate thousands. However, to be 100% accurate without 1 VND rounding errors:
                                    const expectedSessionFee = Math.round(exactCalculatedFee / sessionCount);
                                    const subjectTotal = (feePerSession === expectedSessionFee && exactCalculatedFee > 0) 
                                        ? exactCalculatedFee 
                                        : (feePerSession * sessionCount);
                                    
                                    const periodLabel = enr.period === 'SEMESTER' ? '학기 중' : '방학 특강';
                                    const gradeLabel = enr.curriculum === 'KOREAN' 
                                        ? (enr.gradeGroup === 'ELEM' ? '초등' : enr.gradeGroup === 'MID' ? '중등' : '고등')
                                        : (enr.gradeGroup === 'G7_9' ? 'G7-9' : 'G10-12');
                                        
                                    return (
                                        <tr key={i} className="hover:bg-blue-100 transition-colors">
                                            <td className="px-3 py-2 text-slate-800">{enr.subjectName || '-'}</td>
                                            <td className="px-3 py-2 text-slate-600">{periodLabel}</td>
                                            <td className="px-3 py-2 text-slate-600">{gradeLabel}</td>
                                            <td className="px-3 py-2 text-slate-600">{sessionCount}회</td>
                                            <td className="px-3 py-2 text-right text-slate-800">{feePerSession.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-center text-slate-600">{enr.startDate || '-'}</td>
                                            <td className="px-3 py-2 text-slate-600">{enr.depositorName || '-'}</td>
                                            <td className="px-3 py-2 text-right font-semibold text-blue-700">{subjectTotal.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="border-t-2 border-blue-300">
                                <tr>
                                    <td colSpan={7} className="px-3 py-3 text-right font-bold text-slate-800">
                                        총 수강료 합계: 
                                    </td>
                                    <td className="px-3 py-3 text-right text-xl font-bold text-blue-700">
                                        {enrollments.reduce((acc, enr) => {
                                            const sessionCount = Number(enr.targetSessionsMonth) || 0;
                                            const feePerSession = Number(enr.feePerSession) || 0;
                                            const exactCalculatedFee = calculateFee(enr.curriculum, enr.period, enr.gradeGroup, sessionCount);
                                            const expectedSessionFee = Math.round(exactCalculatedFee / sessionCount);
                                            
                                            const subjectTotal = (feePerSession === expectedSessionFee && exactCalculatedFee > 0) 
                                                ? exactCalculatedFee 
                                                : (feePerSession * sessionCount);
                                                
                                            return acc + subjectTotal;
                                        }, 0).toLocaleString()} VND
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-3 pt-6 border-t border-slate-200">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto px-4 py-2 sm:py-2.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    취소
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 sm:py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                >
                    {loading ? (
                        <>처리 중...</>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            {isEdit ? "변경사항 저장" : "등록하기"}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
