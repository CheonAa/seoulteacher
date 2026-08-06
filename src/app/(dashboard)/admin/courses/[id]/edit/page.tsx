"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Edit2, FileText, Video, Radio, Calendar, Download, Paperclip, Save, Loader2, UploadCloud } from "lucide-react";

interface Attachment {
    id?: string;
    name: string;
    url: string;
}

interface Lecture {
    id?: string;
    title: string;
    order: number;
    type: "VOD" | "LIVE";
    videoUrl?: string | null;
    liveUrl?: string | null;
    liveStartTime?: string | null;
    content?: string | null;
    attachments?: Attachment[];
}

interface Chapter {
    id?: string;
    title: string;
    order: number;
    lectures: Lecture[];
}

interface Course {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    instructorId: string;
}

export default function CourseEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params);
    const router = useRouter();

    const [course, setCourse] = useState<Course | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLectureId, setUploadingLectureId] = useState<number | string | null>(null);
    const [message, setMessage] = useState("");

    // Form course settings states
    const [courseTitle, setCourseTitle] = useState("");
    const [courseDesc, setCourseDesc] = useState("");
    const [courseThumbnail, setCourseThumbnail] = useState("");

    // Tracking active accordion / open states for chapters
    const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(0);
    const [activeLectureIndices, setActiveLectureIndices] = useState<Record<number, number | null>>({});

    // Load course data and curriculum
    useEffect(() => {
        const loadCourseData = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/courses/${courseId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCourse({
                        id: data.id,
                        title: data.title,
                        description: data.description,
                        thumbnailUrl: data.thumbnailUrl,
                        instructorId: data.instructorId
                    });
                    setCourseTitle(data.title);
                    setCourseDesc(data.description || "");
                    setCourseThumbnail(data.thumbnailUrl || "");
                    
                    if (data.chapters) {
                        setChapters(data.chapters);
                    }
                } else {
                    alert("강좌를 불러오는 데 실패했습니다.");
                    router.push("/admin/courses");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadCourseData();
    }, [courseId, router]);

    // Handle course meta updates
    const handleSaveCourseMeta = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/courses/${courseId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: courseTitle,
                    description: courseDesc,
                    thumbnailUrl: courseThumbnail
                })
            });

            if (res.ok) {
                const data = await res.json();
                setCourse(data);
                showToast("기본 정보가 저장되었습니다.");
            } else {
                alert("기본 정보 저장 실패");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // Show temporary message toast
    const showToast = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 3000);
    };

    // --- Curriculum Builders ---

    const handleAddChapter = () => {
        const newChapter: Chapter = {
            title: `새 챕터 ${chapters.length + 1}`,
            order: chapters.length + 1,
            lectures: []
        };
        setChapters([...chapters, newChapter]);
        setActiveChapterIndex(chapters.length);
    };

    const handleRemoveChapter = (chapterIndex: number) => {
        if (!confirm("이 챕터를 삭제하시겠습니까? 챕터 내 모든 강의가 지워집니다.")) return;
        const newChapters = chapters.filter((_, idx) => idx !== chapterIndex);
        // Re-order
        newChapters.forEach((ch, idx) => {
            ch.order = idx + 1;
        });
        setChapters(newChapters);
        setActiveChapterIndex(null);
    };

    const handleChapterTitleChange = (chapterIndex: number, newTitle: string) => {
        const newChapters = [...chapters];
        newChapters[chapterIndex].title = newTitle;
        setChapters(newChapters);
    };

    const handleAddLecture = (chapterIndex: number) => {
        const lectures = chapters[chapterIndex].lectures;
        const newLecture: Lecture = {
            title: `새 강의 ${lectures.length + 1}`,
            order: lectures.length + 1,
            type: "VOD",
            videoUrl: "",
            liveUrl: "",
            liveStartTime: "",
            content: "",
            attachments: []
        };

        const newChapters = [...chapters];
        newChapters[chapterIndex].lectures = [...lectures, newLecture];
        setChapters(newChapters);
        
        // Open the newly created lecture
        setActiveLectureIndices({
            ...activeLectureIndices,
            [chapterIndex]: lectures.length
        });
    };

    const handleRemoveLecture = (chapterIndex: number, lectureIndex: number) => {
        if (!confirm("이 강의를 삭제하시겠습니까?")) return;
        const newChapters = [...chapters];
        const lectures = newChapters[chapterIndex].lectures.filter((_, idx) => idx !== lectureIndex);
        // Re-order
        lectures.forEach((lec, idx) => {
            lec.order = idx + 1;
        });
        newChapters[chapterIndex].lectures = lectures;
        setChapters(newChapters);
        
        setActiveLectureIndices({
            ...activeLectureIndices,
            [chapterIndex]: null
        });
    };

    const handleLectureFieldChange = (chapterIndex: number, lectureIndex: number, field: keyof Lecture, value: any) => {
        const newChapters = [...chapters];
        (newChapters[chapterIndex].lectures[lectureIndex] as any)[field] = value;
        setChapters(newChapters);
    };

    // Handle File Upload for Lecture Attachments
    const handleFileUpload = async (chapterIndex: number, lectureIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const key = `${chapterIndex}-${lectureIndex}`;
        try {
            setUploadingLectureId(key);
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append("files", files[i]);
            }

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const uploadedAttachments = data.files.map((f: any) => ({
                    name: f.name,
                    url: f.url
                }));

                const newChapters = [...chapters];
                const currentAttachments = newChapters[chapterIndex].lectures[lectureIndex].attachments || [];
                newChapters[chapterIndex].lectures[lectureIndex].attachments = [...currentAttachments, ...uploadedAttachments];
                setChapters(newChapters);
                showToast("자료 파일이 업로드되었습니다.");
            } else {
                const errData = await res.json();
                alert(errData.error || "파일 업로드 실패");
            }
        } catch (err) {
            console.error(err);
            alert("서버 전송 실패");
        } finally {
            setUploadingLectureId(null);
        }
    };

    const handleRemoveAttachment = (chapterIndex: number, lectureIndex: number, attIndex: number) => {
        const newChapters = [...chapters];
        const attachments = newChapters[chapterIndex].lectures[lectureIndex].attachments || [];
        newChapters[chapterIndex].lectures[lectureIndex].attachments = attachments.filter((_, idx) => idx !== attIndex);
        setChapters(newChapters);
    };

    // Save Curriculum to database
    const handleSaveCurriculum = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/courses/${courseId}/curriculum`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chapters })
            });

            if (res.ok) {
                const data = await res.json();
                setChapters(data);
                showToast("커리큘럼 및 전 범위 구성이 저장되었습니다.");
            } else {
                alert("커리큘럼 저장 실패");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            
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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">과정 구성 및 커리큘럼 빌더</h1>
                        <p className="text-slate-500 text-sm mt-0.5">VOD 비디오 링크 및 실시간 온라인 화상(Zoom/Google Meet) 일정을 편성합니다.</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSaveCurriculum}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors gap-1.5"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        커리큘럼 전체 저장
                    </button>
                </div>
            </div>

            {message && (
                <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg font-bold text-sm transition-all animate-bounce">
                    ✓ {message}
                </div>
            )}

            {loading ? (
                <div className="h-96 w-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left: General Settings (4 cols) */}
                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-5 space-y-4">
                        <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                            <FileText className="w-5 h-5 text-blue-600" />
                            과정 기본 정보
                        </h3>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">과정 제목</label>
                            <input
                                type="text"
                                value={courseTitle}
                                onChange={(e) => setCourseTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">강좌 소개</label>
                            <textarea
                                value={courseDesc}
                                onChange={(e) => setCourseDesc(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">썸네일 이미지 URL</label>
                            <input
                                type="url"
                                value={courseThumbnail}
                                onChange={(e) => setCourseThumbnail(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                            />
                        </div>

                        <button
                            onClick={handleSaveCourseMeta}
                            disabled={saving}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold rounded-lg text-sm transition-colors"
                        >
                            기본 정보 업데이트
                        </button>
                    </div>

                    {/* Right: Curriculum Builder (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">챕터 및 차시 상세 구성</h3>
                                <p className="text-xs text-slate-400 mt-0.5">챕터를 만들고 챕터 아래 비디오 차시 및 실시간 대화방을 매핑해 주세요.</p>
                            </div>
                            <button
                                onClick={handleAddChapter}
                                className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-colors gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> 챕터 추가
                            </button>
                        </div>

                        {/* Chapters Loop */}
                        {chapters.length === 0 ? (
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 space-y-2">
                                <Plus className="w-8 h-8 mx-auto text-slate-300" />
                                <p className="text-sm font-medium">구성된 챕터가 없습니다.</p>
                                <button
                                    onClick={handleAddChapter}
                                    className="text-xs font-bold text-blue-600 hover:underline"
                                >
                                    첫 번째 챕터 추가하기
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {chapters.map((chapter, chIdx) => {
                                    const isOpen = activeChapterIndex === chIdx;
                                    return (
                                        <div key={chIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            
                                            {/* Chapter Head */}
                                            <div className="bg-slate-50 px-5 py-4 flex items-center justify-between border-b border-slate-200">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">챕터 {chIdx + 1}</span>
                                                    <input
                                                        type="text"
                                                        value={chapter.title}
                                                        onChange={(e) => handleChapterTitleChange(chIdx, e.target.value)}
                                                        className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white outline-none px-1.5 py-0.5 text-sm flex-1 max-w-sm rounded"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setActiveChapterIndex(isOpen ? null : chIdx)}
                                                        className="text-xs font-bold text-slate-500 hover:text-slate-800"
                                                    >
                                                        {isOpen ? "닫기" : "강의 보기"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveChapter(chIdx)}
                                                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Chapter Lectures Panel */}
                                            {isOpen && (
                                                <div className="p-5 space-y-4 bg-slate-50/30">
                                                    
                                                    {/* Lectures List */}
                                                    {chapter.lectures.length === 0 ? (
                                                        <div className="text-center py-6 text-slate-400 text-xs">
                                                            이 챕터 아래 개설된 강의 차시가 없습니다.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {chapter.lectures.map((lecture, lecIdx) => {
                                                                const isLecOpen = activeLectureIndices[chIdx] === lecIdx;
                                                                const fileKey = `${chIdx}-${lecIdx}`;
                                                                return (
                                                                    <div key={lecIdx} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                                        
                                                                        {/* Lecture Summary Title Row */}
                                                                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-white">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActiveLectureIndices({
                                                                                        ...activeLectureIndices,
                                                                                        [chIdx]: isLecOpen ? null : lecIdx
                                                                                    });
                                                                                }}
                                                                                className="flex items-center gap-2 flex-1 text-left"
                                                                            >
                                                                                <span className="text-xs font-semibold text-slate-400">차시 {lecIdx + 1}</span>
                                                                                {lecture.type === "VOD" ? (
                                                                                    <Video className="w-3.5 h-3.5 text-blue-500" />
                                                                                ) : (
                                                                                    <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                                                                                )}
                                                                                <span className="font-bold text-slate-800 text-sm hover:underline">{lecture.title || "제목 없는 차시"}</span>
                                                                            </button>
                                                                            
                                                                            <button
                                                                                onClick={() => handleRemoveLecture(chIdx, lecIdx)}
                                                                                className="text-slate-400 hover:text-red-500 p-1"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>

                                                                        {/* Lecture Edit Form Body */}
                                                                        {isLecOpen && (
                                                                            <div className="p-4 bg-slate-50/20 border-t border-slate-100 space-y-4 text-slate-800">
                                                                                
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-xs font-bold text-slate-500">강의 제목</label>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={lecture.title}
                                                                                            onChange={(e) => handleLectureFieldChange(chIdx, lecIdx, "title", e.target.value)}
                                                                                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                                                        />
                                                                                    </div>
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-xs font-bold text-slate-500">강의 종류</label>
                                                                                        <select
                                                                                            value={lecture.type}
                                                                                            onChange={(e) => handleLectureFieldChange(chIdx, lecIdx, "type", e.target.value)}
                                                                                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                                                        >
                                                                                            <option value="VOD">VOD (동영상 녹화 강의)</option>
                                                                                            <option value="LIVE">LIVE (실시간 원격 수업)</option>
                                                                                        </select>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Conditional VOD Video URL */}
                                                                                {lecture.type === "VOD" ? (
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-xs font-bold text-slate-500 block">VOD 동영상 주소 (유튜브/비메오 등 임베드 주소)</label>
                                                                                        <input
                                                                                            type="url"
                                                                                            placeholder="https://www.youtube.com/embed/..."
                                                                                            value={lecture.videoUrl || ""}
                                                                                            onChange={(e) => handleLectureFieldChange(chIdx, lecIdx, "videoUrl", e.target.value)}
                                                                                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                                                        />
                                                                                    </div>
                                                                                ) : (
                                                                                    /* Conditional LIVE parameters */
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                        <div className="space-y-1">
                                                                                            <label className="text-xs font-bold text-slate-500">화상 회의 링크 (Zoom / Google Meet)</label>
                                                                                            <input
                                                                                                type="url"
                                                                                                placeholder="https://meet.google.com/..."
                                                                                                value={lecture.liveUrl || ""}
                                                                                                onChange={(e) => handleLectureFieldChange(chIdx, lecIdx, "liveUrl", e.target.value)}
                                                                                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                                                            />
                                                                                        </div>
                                                                                        <div className="space-y-1">
                                                                                            <label className="text-xs font-bold text-slate-500">실시간 시작 예정 일시</label>
                                                                                            <input
                                                                                                type="datetime-local"
                                                                                                value={lecture.liveStartTime ? new Date(new Date(lecture.liveStartTime).getTime() - new Date().getTimezoneOffset()*60000).toISOString().slice(0, 16) : ""}
                                                                                                onChange={(e) => handleLectureFieldChange(chIdx, lecIdx, "liveStartTime", e.target.value)}
                                                                                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                <div className="space-y-1">
                                                                                    <label className="text-xs font-bold text-slate-500">강의 상세 설명 / 필독 노트</label>
                                                                                    <textarea
                                                                                        placeholder="강의 전 안내사항이나 숙제 범위 등을 기록해 주세요."
                                                                                        value={lecture.content || ""}
                                                                                        onChange={(e) => handleLectureFieldChange(chIdx, lecIdx, "content", e.target.value)}
                                                                                        rows={3}
                                                                                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                                                                                    />
                                                                                </div>

                                                                                {/* Attachments (Lecture Materials) Area */}
                                                                                <div className="space-y-2 border-t border-slate-100 pt-3">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                                                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                                                                            강의 첨부 자료 ({lecture.attachments?.length ?? 0})
                                                                                        </span>
                                                                                        
                                                                                        {/* File input label styled as cloud upload */}
                                                                                        <label className="cursor-pointer inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded">
                                                                                            {uploadingLectureId === fileKey ? (
                                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                                            ) : (
                                                                                                <UploadCloud className="w-3.5 h-3.5" />
                                                                                            )}
                                                                                            파일 추가
                                                                                            <input
                                                                                                type="file"
                                                                                                multiple
                                                                                                disabled={uploadingLectureId !== null}
                                                                                                onChange={(e) => handleFileUpload(chIdx, lecIdx, e)}
                                                                                                className="hidden"
                                                                                            />
                                                                                        </label>
                                                                                    </div>

                                                                                    {/* Render attachments list */}
                                                                                    {lecture.attachments && lecture.attachments.length > 0 && (
                                                                                        <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                                                                            {lecture.attachments.map((att, attIdx) => (
                                                                                                <div key={attIdx} className="flex items-center justify-between text-xs text-slate-600 bg-white px-2.5 py-1.5 rounded border border-slate-150">
                                                                                                    <span className="truncate max-w-[80%]">{att.name}</span>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => handleRemoveAttachment(chIdx, lecIdx, attIdx)}
                                                                                                        className="text-slate-400 hover:text-red-500 font-bold"
                                                                                                    >
                                                                                                        &times;
                                                                                                    </button>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Add lecture button */}
                                                    <button
                                                        onClick={() => handleAddLecture(chIdx)}
                                                        className="w-full py-2.5 border border-dashed border-slate-350 hover:bg-slate-100 hover:border-slate-400 transition-colors text-xs font-bold text-slate-600 flex items-center justify-center gap-1 rounded-lg"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" /> 새 강의 차시 개설
                                                    </button>

                                                </div>
                                            )}

                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            )}

        </div>
    );
}
