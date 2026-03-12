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

    const [calc, setCalc] = useState({
        curriculum: 'KOREAN',
        period: 'SEMESTER',
        gradeGroup: 'ELEM',
        sessions: 8,
        targetIndex: 0 // Keep track of which enrollment index we're applying the calculation to
    });

    const [totalFee, setTotalFee] = useState(7000000);

    useEffect(() => {
        let fee = 0;
        const { curriculum, period, gradeGroup, sessions } = calc;

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
            let base8 = gradeGroup === 'G7_9' ? 11000000 : 12500000;
            let perSession = base8 / 8;

            if (period === 'SEMESTER') {
                if (sessions === 8) fee = base8;
            } else if (period === 'VACATION') {
                if (sessions === 12) fee = (base8 + (4 * perSession)) * 0.9;
                else if (sessions === 20) fee = (base8 + (12 * perSession)) * 0.8;
            }
        }

        setTotalFee(fee);

        if (fee > 0) {
            const rawSessionFee = fee / sessions;
            const truncatedSessionFee = Math.floor(rawSessionFee / 1000) * 1000;

            setEnrollments(prev => {
                const newArr = [...prev];
                if (newArr[calc.targetIndex]) {
                    newArr[calc.targetIndex] = {
                        ...newArr[calc.targetIndex],
                        feePerSession: String(truncatedSessionFee),
                        targetSessionsMonth: String(sessions)
                    };
                }
                return newArr;
            });
        }
    }, [calc]);

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

    const handleEnrollmentChange = (index: number, field: string, value: string) => {
        const newEnrollments = [...enrollments];
        newEnrollments[index] = { ...newEnrollments[index], [field]: value };
        setEnrollments(newEnrollments);
    };

    const addEnrollment = () => {
        setEnrollments([...enrollments, {
            id: "", // Empty ID for new enrollments
            instructorId: instructors.length > 0 ? instructors[0].id : "",
            subjectName: "",
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
                feePerSession: Number(enr.feePerSession),
                targetSessionsMonth: Number(enr.targetSessionsMonth),
                depositorName: enr.depositorName || null,
                status: enr.status,
                startDate: enr.startDate,
                pausedReason: enr.pausedReason
            }));

            // Calculate total fee per session truncation per requirement
            const finalEnrollments = processedEnrollments.map(enr => ({
                ...enr,
                feePerSession: Math.floor(enr.feePerSession / 1000) * 1000
            }));

            const payload = {
                ...formData,
                parents: parents.filter((p: any) => p.name.trim() !== "" && p.phone.trim() !== ""),
                enrollments: finalEnrollments,
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

        const subjectName = prompt("특강 수강 과목 명을 입력하세요 (예: 인터수학 여름특강):");
        if (!subjectName) return;
        const feePerSession = prompt("특강 1회당 수강료를 입력하세요 (VND):", enr.feePerSession);
        if (!feePerSession) return;
        const targetSessionsMonth = prompt("특강 목표 회차를 입력하세요:", "12");
        if (!targetSessionsMonth) return;
        const startDate = prompt("특강 시작 일자를 입력하세요 (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
        if (!startDate) return;

        if (confirm("기존 수강을 일시 중단하고 이월 회차를 포함하여 특강으로 전환하시겠습니까?")) {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/enrollment/${enr.id}/transition`, {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        subjectName,
                        feePerSession: Number(feePerSession),
                        targetSessionsMonth: Number(targetSessionsMonth),
                        depositorName: enr.depositorName,
                        startDate
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

            <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                    <h3 className="text-lg font-medium text-slate-900">
                        학부모 정보 (Parents)
                    </h3>
                    <button
                        type="button"
                        onClick={addParent}
                        className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-md font-medium transition-colors"
                    >
                        + 학부모 추가
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
                                    className="mb-1 text-red-500 hover:text-red-700 font-medium text-sm p-2 bg-white border border-red-200 rounded-md whitespace-nowrap"
                                >
                                    삭제
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                    수강료 자동 계산기 (선택)
                </h3>
                <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100 mb-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-blue-800 mb-1">적용할 수강 항목</label>
                            <select
                                value={calc.targetIndex}
                                onChange={(e) => setCalc(prev => ({ ...prev, targetIndex: Number(e.target.value) }))}
                                className="block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                {enrollments.map((enr, i) => (
                                    <option key={i} value={i}>수강 정보 {i + 1} ({enr.subjectName || "미지원 과목"})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-blue-800 mb-1">교육과정</label>
                            <select
                                value={calc.curriculum}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCalc(prev => ({
                                        ...prev,
                                        curriculum: val,
                                        gradeGroup: val === 'KOREAN' ? 'ELEM' : 'G7_9',
                                        sessions: 8
                                    }))
                                }}
                                className="block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="KOREAN">한국 교육과정</option>
                                <option value="INTERNATIONAL">해외 교육과정</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-blue-800 mb-1">기간 (학기/방학)</label>
                            <select
                                value={calc.period}
                                onChange={(e) => {
                                    setCalc(prev => ({
                                        ...prev,
                                        period: e.target.value,
                                        sessions: e.target.value === 'SEMESTER' ? 8 : 12
                                    }))
                                }}
                                className="block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="SEMESTER">학기 중</option>
                                <option value="VACATION">방학 특강</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-blue-800 mb-1">학년/과정</label>
                            <select
                                value={calc.gradeGroup}
                                onChange={(e) => setCalc(prev => ({ ...prev, gradeGroup: e.target.value }))}
                                className="block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                {calc.curriculum === 'KOREAN' ? (
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
                            <label className="block text-xs font-semibold text-blue-800 mb-1">수업 횟수</label>
                            <select
                                value={calc.sessions}
                                onChange={(e) => setCalc(prev => ({ ...prev, sessions: Number(e.target.value) }))}
                                className="block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                {calc.curriculum === 'KOREAN' && calc.period === 'SEMESTER' && (
                                    <>
                                        <option value={8}>8회 기준</option>
                                        <option value={12}>12회 기준</option>
                                    </>
                                )}
                                {calc.curriculum === 'KOREAN' && calc.period === 'VACATION' && (
                                    <>
                                        <option value={12}>12회 기준</option>
                                        <option value={18}>18회 기준</option>
                                        <option value={24}>24회 기준 (15% 할인)</option>
                                        <option value={30}>30회 기준 (20% 할인)</option>
                                    </>
                                )}
                                {calc.curriculum === 'INTERNATIONAL' && calc.period === 'SEMESTER' && (
                                    <option value={8}>8회 기준</option>
                                )}
                                {calc.curriculum === 'INTERNATIONAL' && calc.period === 'VACATION' && (
                                    <>
                                        <option value={12}>12회 기준 (8회+4회, 10%할인)</option>
                                        <option value={20}>20회 기준 (8회+12회, 20%할인)</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-white p-3 rounded-md border border-blue-200">
                        <span className="text-sm font-medium text-slate-700">총 결제 예정 금액:</span>
                        <span className="text-xl font-bold text-blue-600">
                            {totalFee > 0 ? `${totalFee.toLocaleString()} VND` : '해당 조건 없음'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                    <h3 className="text-lg font-medium text-slate-900">
                        수강 등록 정보 (Enrollment)
                    </h3>
                    <button
                        type="button"
                        onClick={addEnrollment}
                        className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-md font-medium transition-colors"
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
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
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
                                <div className="flex items-center gap-2">
                                    {enr.id && enr.status === 'ACTIVE' && isEdit && (
                                         <button
                                            type="button"
                                            onClick={() => handleTransition(index)}
                                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                                            title="해당 수강을 일시 중단하고 이월 회차를 새 특강으로 넘깁니다"
                                         >
                                            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> 특강 전환
                                         </button>
                                    )}
                                    {enr.id && enr.status === 'PAUSED' && isEdit && (
                                         <button
                                            type="button"
                                            onClick={() => handleResume(index)}
                                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                                            title="특강을 종료하고 해당 수강을 재개합니다"
                                         >
                                            <PlayCircle className="w-3.5 h-3.5 mr-1" /> 수강 재개
                                         </button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                    <label className="block text-sm font-medium text-slate-700">1회차 수강료 (VND) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        name="feePerSession"
                                        required
                                        min="0"
                                        step="1000"
                                        value={enr.feePerSession}
                                        onChange={(e) => handleEnrollmentChange(index, "feePerSession", e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="1562000"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">천 단위 미만 절사(버림)로 입력해주세요.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">목표 회차 <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        name="targetSessionsMonth"
                                        required
                                        min="1"
                                        max="60"
                                        value={enr.targetSessionsMonth}
                                        onChange={(e) => handleEnrollmentChange(index, "targetSessionsMonth", e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="8"
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-sm font-medium text-slate-700">시작 일자</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={enr.startDate}
                                        onChange={(e) => handleEnrollmentChange(index, "startDate", e.target.value)}
                                        className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div className="lg:col-span-2">
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
