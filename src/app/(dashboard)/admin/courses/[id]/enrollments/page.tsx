"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Users, Search, Loader2 } from "lucide-react";

interface Student {
    id: string;
    name: string;
    school: string | null;
    grade: string | null;
}

interface Course {
    id: string;
    title: string;
}

export default function CourseEnrollmentsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params);
    const router = useRouter();

    const [course, setCourse] = useState<Course | null>(null);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const loadEnrollmentData = async () => {
            try {
                setLoading(true);
                // 1. Fetch course details
                const courseRes = await fetch(`/api/courses/${courseId}`);
                if (courseRes.ok) {
                    const courseData = await courseRes.json();
                    setCourse({ id: courseData.id, title: courseData.title });
                } else {
                    alert("강좌를 찾을 수 없습니다.");
                    router.push("/admin/courses");
                    return;
                }

                // 2. Fetch enrollment info
                const enrollRes = await fetch(`/api/courses/${courseId}/enroll`);
                if (enrollRes.ok) {
                    const enrollData = await enrollRes.json();
                    setAllStudents(enrollData.all);
                    setSelectedStudentIds(enrollData.enrolled.map((s: Student) => s.id));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadEnrollmentData();
    }, [courseId, router]);

    // Checkbox toggle
    const handleToggleStudent = (studentId: string) => {
        if (selectedStudentIds.includes(studentId)) {
            setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
        } else {
            setSelectedStudentIds([...selectedStudentIds, studentId]);
        }
    };

    // Check all filtered
    const handleSelectAllFiltered = (filteredIds: string[]) => {
        const otherSelected = selectedStudentIds.filter(id => !filteredIds.includes(id));
        
        // If all filtered are already selected, deselect them. Otherwise, select all.
        const allFilteredSelected = filteredIds.every(id => selectedStudentIds.includes(id));
        if (allFilteredSelected) {
            setSelectedStudentIds(otherSelected);
        } else {
            setSelectedStudentIds([...otherSelected, ...filteredIds]);
        }
    };

    // Save mapping to db
    const handleSaveEnrollments = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/courses/${courseId}/enroll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentIds: selectedStudentIds })
            });

            if (res.ok) {
                alert("수강자 명단이 성공적으로 저장되었습니다.");
                router.push("/admin/courses");
            } else {
                alert("수강자 명단 저장 실패");
            }
        } catch (err) {
            console.error(err);
            alert("서버 연결 오류");
        } finally {
            setSaving(false);
        }
    };

    // Filter students by search query
    const filteredStudents = allStudents.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.school && s.school.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.grade && s.grade.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredIds = filteredStudents.map(s => s.id);
    const isAllFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedStudentIds.includes(id));

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/courses"
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            수강 신청 명단 관리
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">
                            강좌: <strong className="text-blue-900 font-bold">{course?.title}</strong>
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSaveEnrollments}
                    disabled={saving}
                    className="inline-flex items-center px-5 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors gap-1.5"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    저장 후 목록으로
                </button>
            </div>

            {loading ? (
                <div className="h-64 w-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                    
                    {/* Controls Row */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="이름, 학교, 학년으로 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-slate-50"
                            />
                        </div>
                        <div className="text-sm font-semibold text-slate-600 self-end sm:self-center">
                            선택된 수강생: <span className="text-blue-600 font-bold">{selectedStudentIds.length}</span> / {allStudents.length}명
                        </div>
                    </div>

                    {/* Table / Grid */}
                    {filteredStudents.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            검색 결과 조건에 맞는 학생이 존재하지 않습니다.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Select All Checkbox Card */}
                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="select-all"
                                    checked={isAllFilteredSelected}
                                    onChange={() => handleSelectAllFiltered(filteredIds)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="select-all" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                    {isAllFilteredSelected ? "선택 조건 전체 해제" : "검색된 학생 전체 선택"}
                                </label>
                            </div>

                            {/* Students Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                {filteredStudents.map((student) => {
                                    const isChecked = selectedStudentIds.includes(student.id);
                                    return (
                                        <div
                                            key={student.id}
                                            onClick={() => handleToggleStudent(student.id)}
                                            className={`flex items-center gap-4 px-4 py-3.5 border rounded-xl shadow-sm cursor-pointer transition-all ${
                                                isChecked
                                                    ? "bg-blue-50/50 border-blue-500/50 hover:bg-blue-50"
                                                    : "bg-white border-slate-200 hover:bg-slate-50"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {}} // Handle on parent div click
                                                className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                            />
                                            <div className="space-y-0.5">
                                                <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                                                <div className="text-xs text-slate-500 font-semibold">
                                                    {student.school || "학교 미기입"} • {student.grade ? `${student.grade}학년` : "학년 미기입"}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
            )}

        </div>
    );
}
