"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Calculator } from "lucide-react";

type Instructor = {
    id: string;
    name: string;
    email: string;
};

export default function StudentForm({ instructors }: { instructors: Instructor[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [parents, setParents] = useState([{ name: "", phone: "", relation: "Mother" }]);
    const [formData, setFormData] = useState({
        name: "",
        gender: "M",
        school: "",
        grade: "",
        phone: "",
        instructorId: instructors.length > 0 ? instructors[0].id : "",
        subjectName: "",
        feePerSession: "875000",
        targetSessionsMonth: "8",
        depositorName: "",
    });

    const [calc, setCalc] = useState({
        curriculum: 'KOREAN',
        period: 'SEMESTER',
        gradeGroup: 'ELEM',
        sessions: 8
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
            setFormData(prev => ({
                ...prev,
                feePerSession: String(Math.round(fee / sessions)),
                targetSessionsMonth: String(sessions)
            }));
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
        const newParents = parents.filter((_, i) => i !== index);
        setParents(newParents);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/admin/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    gender: formData.gender,
                    school: formData.school,
                    grade: formData.grade,
                    phone: formData.phone || null,
                    instructorId: formData.instructorId,
                    subjectName: formData.subjectName,
                    feePerSession: Number(formData.feePerSession),
                    targetSessionsMonth: Number(formData.targetSessionsMonth),
                    depositorName: formData.depositorName || null,
                    parents: parents.filter(p => p.name.trim() !== "" && p.phone.trim() !== ""), // 이름과 연락처가 모두 있는 학부모만 등록
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "등록에 실패했습니다.");

            router.push("/admin/students");
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
                    {parents.map((parent, index) => (
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

                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">
                    최초 수강 등록 정보 (Enrollment)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">담당 강사 <span className="text-red-500">*</span></label>
                        <select
                            name="instructorId"
                            required
                            value={formData.instructorId}
                            onChange={handleChange}
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
                            value={formData.subjectName}
                            onChange={handleChange}
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
                            value={formData.feePerSession}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="1562500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">월 목표 회차 <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            name="targetSessionsMonth"
                            required
                            min="1"
                            max="31"
                            value={formData.targetSessionsMonth}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="8"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">입금자명 (예금주)</label>
                        <input
                            type="text"
                            name="depositorName"
                            value={formData.depositorName}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="학생 이름 또는 학부모 이름"
                        />
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
                        <>처리 중...</>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            등록하기
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
