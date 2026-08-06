"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, BookOpen, Edit2, Trash2, Users, User, ArrowRight, Loader2 } from "lucide-react";

interface Course {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    instructorId: string;
    instructor: {
        name: string;
    };
    _count?: {
        enrollments: number;
    };
    createdAt: string;
}

interface Instructor {
    id: string;
    name: string;
    role: string;
}

export default function AdminCoursesPage() {
    const { data: session } = useSession();
    const role = session?.user?.role;

    const [courses, setCourses] = useState<Course[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form states
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [instructorId, setInstructorId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Load courses
    const loadCourses = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/courses");
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            }
        } catch (err) {
            console.error("Failed to load courses", err);
        } finally {
            setLoading(false);
        }
    };

    // Load instructors (only for Owner/Admin to assign course to any instructor)
    const loadInstructors = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                // Filter for instructors and admins
                setInstructors(data.filter((u: any) => u.role === "INSTRUCTOR" || u.role === "ADMIN" || u.role === "OWNER"));
            }
        } catch (err) {
            console.error("Failed to load instructors", err);
        }
    };

    useEffect(() => {
        loadCourses();
        if (role === "OWNER" || role === "ADMIN") {
            loadInstructors();
        }
    }, [role]);

    // Handle course creation
    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("강좌 제목을 입력해 주세요.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            const res = await fetch("/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    thumbnailUrl: thumbnailUrl || null,
                    instructorId: role === "INSTRUCTOR" ? session?.user?.id : (instructorId || null)
                })
            });

            if (res.ok) {
                setIsCreateModalOpen(false);
                setTitle("");
                setDescription("");
                setThumbnailUrl("");
                setInstructorId("");
                loadCourses();
            } else {
                const errData = await res.json();
                setError(errData.error || "강좌 생성에 실패했습니다.");
            }
        } catch (err) {
            console.error(err);
            setError("서버 통신 중 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle course deletion
    const handleDeleteCourse = async (id: string) => {
        if (!confirm("정말 이 강좌를 삭제하시겠습니까? 강좌 내 모든 챕터와 강의 자료가 삭제됩니다.")) return;

        try {
            const res = await fetch(`/api/courses/${id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                loadCourses();
            } else {
                alert("강좌 삭제에 실패했습니다.");
            }
        } catch (err) {
            console.error(err);
            alert("서버 연결 실패");
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        온라인 과정 관리
                    </h1>
                    <p className="text-slate-500 mt-1">학생들이 수강할 온라인 단과 과정 및 실시간 라이브 클래스를 개설하고 관리합니다.</p>
                </div>
                <button
                    onClick={() => {
                        setIsCreateModalOpen(true);
                        setError("");
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    새 과정 개설
                </button>
            </div>

            {loading ? (
                <div className="h-64 w-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
            ) : courses.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 space-y-4">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="font-medium text-lg">개설된 온라인 강좌가 없습니다.</p>
                    <p className="text-sm text-slate-400">우측 상단의 "새 과정 개설" 버튼을 눌러 첫 강의를 만들어 보세요.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                            
                            {/* Course Body */}
                            <div className="p-5 space-y-4">
                                {/* Course Thumbnail Mockup or Actual */}
                                <div className="aspect-video w-full rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative">
                                    {course.thumbnailUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 text-slate-400">
                                            <BookOpen className="w-8 h-8" />
                                            <span className="text-xs">등록된 대표 이미지 없음</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1 hover:text-blue-600 transition-colors">
                                        <Link href={`/admin/courses/${course.id}/edit`}>
                                            {course.title}
                                        </Link>
                                    </h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 h-10 break-all">{course.description || "이 과정에 대한 세부 설명이 아직 작성되지 않았습니다."}</p>
                                </div>

                                {/* Metadata info */}
                                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 border-t border-slate-100 pt-3">
                                    <div className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        <span>강사: {course.instructor.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                        <span>수강자: {course._count?.enrollments ?? 0}명</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <Link
                                        href={`/admin/courses/${course.id}/edit`}
                                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="커리큘럼 편집"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href={`/admin/courses/${course.id}/enrollments`}
                                        className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                        title="수강생 명단 관리"
                                    >
                                        <Users className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteCourse(course.id)}
                                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="강좌 삭제"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <Link
                                    href={`/admin/courses/${course.id}/edit`}
                                    className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors gap-0.5"
                                >
                                    관리하기 <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Course Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 text-lg">새 온라인 강좌 생성</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-700 border border-red-100 px-4 py-2.5 rounded-lg text-sm font-semibold">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 block">강좌 제목 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    placeholder="ex. 초등 수학 레벨업 단과반"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 block">강좌 한 줄 소개</label>
                                <textarea
                                    placeholder="과정에 대한 간략한 핵심 소개를 기록해 주세요."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 block">대표 썸네일 URL (선택)</label>
                                <input
                                    type="url"
                                    placeholder="https://example.com/thumbnail.png"
                                    value={thumbnailUrl}
                                    onChange={(e) => setThumbnailUrl(e.target.value)}
                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                />
                            </div>

                            {/* Instructor assign (Visible for Owner/Admin only, Instructors are auto-assigned) */}
                            {(role === "OWNER" || role === "ADMIN") && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 block">담당 강사 지정</label>
                                    <select
                                        value={instructorId}
                                        onChange={(e) => setInstructorId(e.target.value)}
                                        className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                                    >
                                        <option value="">개설자 본인 ({session?.user?.name})</option>
                                        {instructors.map((inst) => (
                                            <option key={inst.id} value={inst.id}>
                                                {inst.name} ({inst.role === "OWNER" ? "원장" : "강사"})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    강좌 생성
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
