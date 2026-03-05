import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Calendar, User, Eye, Megaphone, Paperclip, Download, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import DeleteNoticeButton from './DeleteNoticeButton'; // We'll create this client component

export const metadata: Metadata = {
    title: '공지사항 상세 | 관리자 대시보드',
};

// Next.js page component
export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    const canEdit = role === "OWNER" || role === "ADMIN";

    // Increments view count and fetches the notice
    const notice = await prisma.notice.update({
        where: { id },
        data: { views: { increment: 1 } },
        include: {
            author: { select: { name: true, role: true } },
            attachments: true,
        }
    }).catch(() => null); // Catch error if notice isn't found (e.g. invalid UUID format)

    if (!notice) {
        return notFound();
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header / Nav */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/notices"
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <Megaphone className="w-6 h-6 text-blue-600" />
                            {notice.isImportant && <span className="text-sm font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded mr-1 align-middle">필독</span>}
                            {notice.title}
                        </h1>
                    </div>
                </div>

                {canEdit && (
                    <div className="flex items-center gap-2 pl-11 sm:pl-0">
                        <Link
                            href={`/admin/notices/${notice.id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-sm font-medium rounded text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                        >
                            <Edit className="w-4 h-4 mr-1.5" />
                            수정
                        </Link>
                        <DeleteNoticeButton noticeId={notice.id} />
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                {/* Notice Metadata */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{notice.author.name}</span>
                        <span className="text-xs text-slate-400">({notice.author.role === 'OWNER' ? '원장' : '관리자'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {format(new Date(notice.createdAt), 'yyyy년 MM월 dd일 HH:mm')}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-slate-400" />
                        조회 {notice.views}
                    </div>
                </div>

                {/* Rich Text React-Quill Output Content */}
                {/* Important: we use dangerouslySetInnerHTML safely because only OWNER/ADMIN can write notices */}
                <div
                    className="px-6 py-8 min-h-[300px] prose prose-slate max-w-none text-slate-900 prose-img:max-w-full prose-img:h-auto prose-img:rounded-md"
                    dangerouslySetInnerHTML={{ __html: notice.content }}
                />

                {/* Attachments Section */}
                {notice.attachments && notice.attachments.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                        <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2 mb-3">
                            <Paperclip className="w-4 h-4 text-slate-500" />
                            첨부파일 ({notice.attachments.length})
                        </h3>
                        <ul className="space-y-2">
                            {notice.attachments.map((att: any) => (
                                <li key={att.id}>
                                    <a
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={att.name}
                                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline bg-white px-3 py-2 rounded-md border border-slate-200 shadow-sm transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        {att.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* External Link Section */}
                {notice.externalLink && (
                    <div className="px-6 py-4 bg-blue-50 border-t border-slate-200">
                        <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2 mb-2">
                            <LinkIcon className="w-4 h-4 text-blue-600" />
                            관련 링크
                        </h3>
                        <a
                            href={notice.externalLink.startsWith('http') ? notice.externalLink : `http://${notice.externalLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                        >
                            {notice.externalLink}
                        </a>
                    </div>
                )}
            </div>

            <div className="flex justify-center mt-8">
                <Link
                    href="/admin/notices"
                    className="inline-flex items-center px-6 py-2.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                    목록으로 돌아가기
                </Link>
            </div>
        </div>
    );
}
