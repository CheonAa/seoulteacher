"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, User, Percent, ArrowRight, Loader2, Calendar } from "lucide-react";

interface EnrolledCourse {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    instructorName: string;
    progress: number;
    totalLectures: number;
    completedLectures: number;
}

export default function StudentCoursesPage() {
    const [courses, setCourses] = useState<EnrolledCourse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEnrolledCourses = async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/courses");
                if (res.ok) {
                    const data = await res.json();
                    setCourses(data);
                }
            } catch (err) {
                console.error("Failed to load student courses", err);
            } finally {
                setLoading(false);
            }
        };
        loadEnrolledCourses();
    }, []);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    나의 온라인 강의실
                </h1>
                <p className="text-slate-500 mt-1">수강 신청된 단과 클래스의 녹화 강의를 시청하거나 실시간 화상 수업에 참여합니다.</p>
            </div>

            {loading ? (
                <div className="h-64 w-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
            ) : courses.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 space-y-4">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="font-medium text-lg">수강 신청된 온라인 과정이 존재하지 않습니다.</p>
                    <p className="text-sm text-slate-400">학원 행정실에 문의하여 수강 명단에 등록해 주세요.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {courses.map((course) => (
                        <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow group">
                            
                            <div className="p-6 space-y-5">
                                <div className="flex gap-4">
                                    {/* Thumbnail */}
                                    <div className="w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                                        {course.thumbnailUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <BookOpen className="w-7 h-7 text-slate-300" />
                                        )}
                                    </div>

                                    {/* Titles */}
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                            <Link href={`/student/courses/${course.id}`}>
                                                {course.title}
                                            </Link>
                                        </h3>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                                            <User className="w-3.5 h-3.5" />
                                            <span>담당: {course.instructorName} 선생님</span>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2 break-all pt-1">
                                            {course.description || "이 과정에 대한 세부 설명이 기록되지 않았습니다."}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-1.5 border-t border-slate-50 pt-4">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <Percent className="w-3.5 h-3.5 text-blue-500" />
                                            학습 진도율
                                        </span>
                                        <span className="text-blue-600">{Math.round(course.progress)}% ({course.completedLectures}/{course.totalLectures} 완료)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                        <div
                                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${course.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* CTA link */}
                            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" /> 언제든지 자율 복습 가능
                                </span>
                                <Link
                                    href={`/student/courses/${course.id}`}
                                    className="inline-flex items-center text-sm font-bold text-[#0055AB] hover:text-blue-700 transition-colors gap-0.5"
                                >
                                    강의실 입장 <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
