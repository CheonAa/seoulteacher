"use client";

import { useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Save, AlertCircle, Paperclip, X, Link as LinkIcon } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';

// Dynamically import ReactQuill to prevent SSR issues
const BaseQuill = dynamic(
    () => import('react-quill-new'),
    {
        ssr: false,
        loading: () => <div className="h-64 bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-slate-400">에디터 로딩 중...</div>
    }
);

// Cast to any to avoid strict props checking errors
const ReactQuill = BaseQuill as any;

interface NoticeFormProps {
    initialData?: {
        id: string;
        title: string;
        content: string;
        isImportant: boolean;
        externalLink?: string | null;
        attachments?: { id: string; name: string; url: string; }[];
    };
    isEdit?: boolean;
}

export default function NoticeForm({ initialData, isEdit = false }: NoticeFormProps) {
    const router = useRouter();

    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [isImportant, setIsImportant] = useState(initialData?.isImportant || false);
    const [externalLink, setExternalLink] = useState(initialData?.externalLink || '');

    // Attachments State
    const [existingAttachments, setExistingAttachments] = useState<{ id: string; name: string; url: string; }[]>(
        initialData?.attachments || []
    );
    const [newFiles, setNewFiles] = useState<File[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // React Quill Modules for rich text editing
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'font': [] }],
                ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image', 'video'],
                ['clean']                                         // remove formatting button
            ],
        }
    }), []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('제목을 입력해주세요.');
            return;
        }

        if (!content.trim() || content === '<p><br></p>') {
            setError('내용을 입력해주세요.');
            return;
        }

        setLoading(true);

        try {
            let finalAttachments: { name: string; url: string; }[] = [...existingAttachments];

            // 1. Upload new files if any
            if (newFiles.length > 0) {
                const formData = new FormData();
                newFiles.forEach(file => formData.append('files', file));

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const data = await uploadRes.json();
                    throw new Error(data.error || '파일 업로드에 실패했습니다.');
                }

                const uploadedData = await uploadRes.json();
                finalAttachments = [...finalAttachments, ...uploadedData.files];
            }

            // 2. Save Notice Data
            const url = isEdit ? `/api/notices/${initialData?.id}` : '/api/notices';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content,
                    isImportant,
                    externalLink,
                    attachments: finalAttachments
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '저장에 실패했습니다.');
            }

            const data = await res.json();
            router.push(`/admin/notices/${isEdit ? data.id : ''}`); // Redirect to list or detail
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 text-red-800 p-4 rounded-md flex items-center text-sm border border-red-200">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            <div className="space-y-1">
                <label className="text-sm font-medium text-slate-900">제목 <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border text-slate-900"
                    placeholder="공지사항 제목을 입력하세요"
                />
            </div>

            <div className="flex items-center">
                <input
                    id="isImportant"
                    name="isImportant"
                    type="checkbox"
                    checked={isImportant}
                    onChange={(e) => setIsImportant(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="isImportant" className="ml-2 block text-sm text-slate-700 font-medium">
                    필독 공지로 상단에 고정
                </label>
            </div>

            <div className="space-y-1 pb-12">
                <label className="text-sm font-medium text-slate-900">내용 <span className="text-red-500">*</span></label>
                <div className="bg-white rounded-md border border-slate-300 text-slate-900 overflow-hidden">
                    <ReactQuill
                        theme="snow"
                        value={content}
                        onChange={setContent}
                        modules={modules}
                        className="min-h-[400px]"
                    />
                </div>
            </div>

            {/* External Link Section */}
            <div className="space-y-1">
                <label className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-slate-500" />
                    외부 링크 (선택사항)
                </label>
                <input
                    type="text"
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border text-slate-900"
                    placeholder="example.com/link (https:// 생략 가능)"
                />
            </div>

            {/* Attachments Section */}
            <div className="space-y-3 pt-6">
                <label className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    첨부파일 (최대 2개)
                </label>

                {/* Existing Attachments */}
                {existingAttachments.length > 0 && (
                    <ul className="space-y-2">
                        {existingAttachments.map((att, idx) => (
                            <li key={att.id} className="flex items-center justify-between text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-md">
                                <span className="text-slate-700 truncate">{att.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setExistingAttachments(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {/* New Attachments */}
                {newFiles.length > 0 && (
                    <ul className="space-y-2">
                        {newFiles.map((file, idx) => (
                            <li key={idx} className="flex items-center justify-between text-sm py-2 px-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                                <span className="truncate">{file.name} (새 파일)</span>
                                <button
                                    type="button"
                                    onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-blue-400 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {/* File Input */}
                {existingAttachments.length + newFiles.length < 2 && (
                    <div>
                        <input
                            type="file"
                            multiple
                            accept="*/*"
                            onChange={(e) => {
                                if (e.target.files) {
                                    const selected = Array.from(e.target.files);
                                    const totalCount = existingAttachments.length + newFiles.length + selected.length;

                                    if (totalCount > 2) {
                                        setError("파일은 총 2개까지만 첨부할 수 있습니다.");
                                    } else {
                                        setNewFiles(prev => [...prev, ...selected]);
                                        setError("");
                                    }
                                }
                                // Reset input so same file can be selected again if removed
                                e.target.value = '';
                            }}
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100 cursor-pointer"
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-4 mt-8 border-t border-slate-200 gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    취소
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? '저장 중...' : (isEdit ? '수정 완료' : '등록 완료')}
                </button>
            </div>
        </form>
    );
}
