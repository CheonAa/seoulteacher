"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Plus, Clock, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";

type Consultation = {
    id: string;
    date: string;
    content: string;
    creatorId: string;
    creatorName: string;
    createdAt: string;
};

export default function StudentConsultationBoard({ studentId, currentUserId, currentUserRole }: { studentId: string, currentUserId: string, currentUserRole: string }) {
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [newDate, setNewDate] = useState(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    const [newContent, setNewContent] = useState("");

    const fetchConsultations = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/students/${studentId}/consultations`);
            if (res.ok) {
                const data = await res.json();
                setConsultations(data.consultations);
            }
        } catch (error) {
            console.error("Failed to fetch consultations", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsultations();
    }, [studentId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate || !newContent.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/admin/students/${studentId}/consultations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: newDate,
                    content: newContent
                })
            });

            if (res.ok) {
                setNewContent("");
                fetchConsultations();
            } else {
                const err = await res.json();
                alert(err.error || "상담 기록 추가에 실패했습니다.");
            }
        } catch (error) {
            alert("상담 기록 추가 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (consultationId: string) => {
        if (!confirm("이 상담 기록을 삭제하시겠습니까?")) return;

        try {
            const res = await fetch(`/api/admin/students/${studentId}/consultations/${consultationId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchConsultations();
            } else {
                const err = await res.json();
                alert(err.error || "삭제에 실패했습니다.");
            }
        } catch (error) {
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">학생 상담 기록</h2>
            </div>

            <div className="p-6 flex flex-col md:flex-row gap-8">
                {/* Left Side: Create Form */}
                <div className="w-full md:w-1/3 flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                        <Plus className="w-4 h-4 text-emerald-600" />
                        새 상담 내용 남기기
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-slate-600">상담 일자</label>
                            <input 
                                type="date" 
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-slate-600">상담 내용</label>
                            <textarea 
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                placeholder="학부모 혹은 학생과 나눈 상담 내용을 상세히 기록하세요."
                                rows={6}
                                className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none font-sans"
                                required
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isSubmitting || !newContent.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-md shadow-sm mt-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <SaveIcon className="w-4 h-4" /> {isSubmitting ? "저장 중..." : "상담 기록 저장"}
                        </button>
                    </form>
                </div>

                {/* Right Side: Timeline */}
                <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-6">
                        <Clock className="w-4 h-4 text-slate-500" />
                        이전 상담 기록 ({consultations.length}건)
                    </h3>

                    {loading ? (
                        <div className="text-sm text-slate-500 text-center py-12">기록을 불러오는 중입니다...</div>
                    ) : consultations.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-12 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                            아직 작성된 상담 기록이 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {consultations.map((c) => (
                                <div key={c.id} className="relative pl-6 pb-2 group">
                                    <div className="absolute left-1.5 top-1.5 bottom-[-1.5rem] w-px bg-slate-200 last:bg-transparent"></div>
                                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-slate-200 border-2 border-white ring-2 ring-transparent group-hover:bg-blue-200 group-hover:border-blue-100 group-hover:ring-blue-50 transition-all"></div>
                                    
                                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 group-hover:border-blue-200 group-hover:shadow transition-all relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">{new Date(c.date).toLocaleDateString('ko-KR')}</span>
                                                <span className="text-slate-500 flex items-center gap-1 text-xs">
                                                    <User className="w-3 h-3" />
                                                    {c.creatorName}
                                                </span>
                                            </div>
                                            {(currentUserRole === 'OWNER' || currentUserId === c.creatorId) && (
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                                                    title="기록 삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SaveIcon({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
    )
}
