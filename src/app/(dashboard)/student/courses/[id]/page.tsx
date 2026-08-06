"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Radio, Calendar, FileText, CheckCircle, Circle, Download, Paperclip, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface Attachment {
    id: string;
    name: string;
    url: string;
}

interface Lecture {
    id: string;
    title: string;
    order: number;
    type: "VOD" | "LIVE";
    videoUrl: string | null;
    liveUrl: string | null;
    liveStartTime: string | null;
    content: string | null;
    attachments: Attachment[];
}

interface Chapter {
    id: string;
    title: string;
    order: number;
    lectures: Lecture[];
}

interface Course {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    instructor: {
        name: string;
    };
    chapters: Chapter[];
}

export default function StudentClassroomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params);
    const router = useRouter();

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Active lecture
    const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [progressUpdating, setProgressUpdating] = useState(false);
    
    // Set of completed lecture IDs
    const [completedLectureIds, setCompletedLectureIds] = useState<Set<string>>(new Set());

    // Accordion open chapters
    const [openChapterIds, setOpenChapterIds] = useState<Set<string>>(new Set());

    // Convert regular YouTube / Vimeo URLs to Embed URLs
    const getEmbedUrl = (url: string | null) => {
        if (!url) return null;
        
        // YouTube URL matching
        const ytReg = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const ytMatch = url.match(ytReg);
        if (ytMatch && ytMatch[2].length === 11) {
            return `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=0&rel=0`;
        }
        
        // Vimeo URL matching
        const vimeoReg = /vimeo\.com\/([0-9]+)/;
        const vimeoMatch = url.match(vimeoReg);
        if (vimeoMatch) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}?h=00000000`;
        }

        return url;
    };

    // Load classroom data
    const loadClassroom = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/courses/${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setCourse(data);

                // Open first chapter by default
                if (data.chapters && data.chapters.length > 0) {
                    setOpenChapterIds(new Set([data.chapters[0].id]));
                    
                    // Set first lecture as active by default
                    const firstChapter = data.chapters[0];
                    if (firstChapter.lectures && firstChapter.lectures.length > 0) {
                        setActiveLecture(firstChapter.lectures[0]);
                    }
                }
            } else {
                alert("강의실 접근 권한이 없거나 강좌를 찾을 수 없습니다.");
                router.push("/student/courses");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Load student's completed lectures progress
    const loadCompletedProgress = async () => {
        if (!course) return;
        const allLectures: Lecture[] = [];
        course.chapters.forEach(ch => {
            if (ch.lectures) allLectures.push(...ch.lectures);
        });

        const completedSet = new Set<string>();
        for (const lec of allLectures) {
            try {
                const res = await fetch(`/api/courses/${courseId}/lectures/${lec.id}/progress`);
                if (res.ok) {
                    const progressData = await res.json();
                    if (progressData.isCompleted) {
                        completedSet.add(lec.id);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
        setCompletedLectureIds(completedSet);
    };

    useEffect(() => {
        loadClassroom();
    }, [courseId]);

    useEffect(() => {
        loadCompletedProgress();
    }, [course]);

    // Track active lecture completion state
    useEffect(() => {
        if (activeLecture) {
            setIsCompleted(completedLectureIds.has(activeLecture.id));
        }
    }, [activeLecture, completedLectureIds]);

    // Handle progress toggle completion
    const handleToggleComplete = async () => {
        if (!activeLecture) return;
        
        try {
            setProgressUpdating(true);
            const newStatus = !isCompleted;
            const res = await fetch(`/api/courses/${courseId}/lectures/${activeLecture.id}/progress`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isCompleted: newStatus })
            });

            if (res.ok) {
                setIsCompleted(newStatus);
                const nextSet = new Set(completedLectureIds);
                if (newStatus) {
                    nextSet.add(activeLecture.id);
                } else {
                    nextSet.delete(activeLecture.id);
                }
                setCompletedLectureIds(nextSet);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setProgressUpdating(false);
        }
    };

    const toggleChapter = (chapterId: string) => {
        const nextSet = new Set(openChapterIds);
        if (nextSet.has(chapterId)) {
            nextSet.delete(chapterId);
        } else {
            nextSet.add(chapterId);
        }
        setOpenChapterIds(nextSet);
    };

    if (loading || !course) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    const embedVideoUrl = activeLecture ? getEmbedUrl(activeLecture.videoUrl) : null;

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-6">
            
            {/* Header / Nav */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/student/courses"
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 line-clamp-1">{course.title}</h1>
                        <p className="text-xs text-slate-500 mt-0.5 font-semibold">담당 선생님: {course.instructor.name} 선생님</p>
                    </div>
                </div>
            </div>

            {/* Main Area: Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left: Player & details (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {activeLecture ? (
                        <div className="space-y-6">
                            
                            {/* Video / Content Box */}
                            <div className="bg-slate-950 rounded-2xl shadow-xl overflow-hidden aspect-video border border-slate-800 relative">
                                {activeLecture.type === "VOD" && embedVideoUrl ? (
                                    <iframe
                                        src={embedVideoUrl}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title={activeLecture.title}
                                    />
                                ) : activeLecture.type === "LIVE" ? (
                                    /* Live class landing card inside player area */
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 space-y-6 text-center select-none">
                                        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center animate-pulse">
                                            <Radio className="w-8 h-8 text-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl md:text-2xl font-black">실시간 화상 수업</h3>
                                            <p className="text-sm text-slate-300 font-semibold">{activeLecture.title}</p>
                                        </div>

                                        {activeLecture.liveStartTime && (
                                            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 text-xs font-semibold text-slate-200 border border-white/20">
                                                <Calendar className="w-4 h-4 text-red-400" />
                                                시작 시간: {format(new Date(activeLecture.liveStartTime), 'yyyy년 MM월 dd일 HH:mm')}
                                            </div>
                                        )}

                                        {activeLecture.liveUrl ? (
                                            <a
                                                href={activeLecture.liveUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all hover:shadow-lg gap-2 text-base"
                                            >
                                                실시간 강의방 입장하기 (Zoom/Meet)
                                                <ArrowRight className="w-5 h-5" />
                                            </a>
                                        ) : (
                                            <div className="text-slate-400 text-xs font-semibold">
                                                * 회의방 링크가 아직 등록되지 않았습니다. 강사 선생님의 안내를 기다려 주세요.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                                        이 차시는 등록된 영상 또는 링크가 없습니다.
                                    </div>
                                )}
                            </div>

                            {/* Lecture Details Title Block */}
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="space-y-1">
                                        <h2 className="text-xl md:text-2xl font-black text-slate-900">{activeLecture.title}</h2>
                                        <div className="flex items-center gap-2 text-xs font-bold">
                                            {activeLecture.type === "VOD" ? (
                                                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                                    <Play className="w-3 h-3 fill-current" /> 동영상 강좌
                                                </span>
                                            ) : (
                                                <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                                                    <Radio className="w-3 h-3 animate-pulse" /> 실시간 라이브 수업
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Completion button */}
                                    <button
                                        onClick={handleToggleComplete}
                                        disabled={progressUpdating}
                                        className={`inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm border transition-all gap-1.5 ${
                                            isCompleted
                                                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                                : "bg-white border-slate-350 text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        {progressUpdating ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                        ) : isCompleted ? (
                                            <CheckCircle className="w-5 h-5 text-green-600 fill-current" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-slate-400" />
                                        )}
                                        {isCompleted ? "학습 완료됨" : "학습 완료하기"}
                                    </button>
                                </div>

                                {/* Lecture Notes Content */}
                                {activeLecture.content && (
                                    <div className="prose prose-slate max-w-none pt-4 border-t border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-line break-all">
                                        {activeLecture.content}
                                    </div>
                                )}

                                {/* Attachments Download section */}
                                {activeLecture.attachments && activeLecture.attachments.length > 0 && (
                                    <div className="border-t border-slate-100 pt-4 space-y-3">
                                        <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                            수업 자료 및 첨부파일 다운로드 ({activeLecture.attachments.length})
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {activeLecture.attachments.map((att) => (
                                                <a
                                                    key={att.id}
                                                    href={att.url}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-700 group/link"
                                                >
                                                    <span className="truncate max-w-[80%] flex items-center gap-1.5">
                                                        <FileText className="w-4 h-4 text-slate-400" />
                                                        {att.name}
                                                    </span>
                                                    <Download className="w-4 h-4 text-slate-400 group-hover/link:text-slate-600 transition-colors" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
                            이 강좌에 등록된 강의가 아직 없습니다.
                        </div>
                    )}
                </div>

                {/* Right: Chapter / Curriculum Sidebar (4 cols) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            전체 강의 커리큘럼
                        </h3>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {course.chapters.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                                등록된 단원이 없습니다.
                            </div>
                        ) : (
                            course.chapters.map((chapter, chIdx) => {
                                const isOpen = openChapterIds.has(chapter.id);
                                return (
                                    <div key={chapter.id} className="bg-white">
                                        
                                        {/* Chapter row trigger */}
                                        <button
                                            onClick={() => toggleChapter(chapter.id)}
                                            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
                                        >
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">단원 {chIdx + 1}</span>
                                                <h4 className="font-bold text-slate-800 text-sm">{chapter.title}</h4>
                                            </div>
                                            <span className="text-xs text-slate-400 font-bold">{isOpen ? "닫기" : "열기"}</span>
                                        </button>

                                        {/* Lectures dropdown list */}
                                        {isOpen && chapter.lectures && (
                                            <div className="bg-slate-50/30 px-3 py-2 border-t border-slate-50 space-y-1">
                                                {chapter.lectures.map((lec, lecIdx) => {
                                                    const isActive = activeLecture?.id === lec.id;
                                                    const completed = completedLectureIds.has(lec.id);
                                                    return (
                                                        <button
                                                            key={lec.id}
                                                            onClick={() => setActiveLecture(lec)}
                                                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-colors text-left ${
                                                                isActive
                                                                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-100"
                                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                                                            }`}
                                                        >
                                                            {/* Checkbox state */}
                                                            {completed ? (
                                                                <CheckCircle className="w-4 h-4 text-green-600 fill-current flex-shrink-0" />
                                                            ) : (
                                                                <Circle className="w-4 h-4 text-slate-350 flex-shrink-0" />
                                                            )}

                                                            <div className="flex-1 min-w-0">
                                                                <p className="truncate text-xs">{lecIdx + 1}강. {lec.title}</p>
                                                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-semibold">
                                                                    {lec.type === "VOD" ? (
                                                                        <span>• VOD 녹화 강의</span>
                                                                    ) : (
                                                                        <span className="text-red-500">• 실시간 라이브 수업</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
}
