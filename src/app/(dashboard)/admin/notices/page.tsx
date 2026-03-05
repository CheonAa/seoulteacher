import { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Plus, Megaphone, Calendar, Eye, User } from 'lucide-react';
import { format } from 'date-fns';

export const metadata: Metadata = {
    title: '공지사항 | 관리자 대시보드',
};

export default async function NoticesPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const sp = await searchParams;
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    const canWrite = role === "OWNER" || role === "ADMIN";

    // Pagination
    const pageItemCount = 10;
    const currentPage = Number(sp?.page) || 1;
    const skip = (currentPage - 1) * pageItemCount;

    const [notices, totalCount] = await Promise.all([
        prisma.notice.findMany({
            skip,
            take: pageItemCount,
            orderBy: [
                { isImportant: 'desc' },
                { createdAt: 'desc' },
            ],
            include: {
                author: { select: { name: true } }
            }
        }),
        prisma.notice.count()
    ]);

    const totalPages = Math.ceil(totalCount / pageItemCount);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-blue-600" />
                        공지사항
                    </h1>
                    <p className="text-slate-500 mt-1">학원 파트너님들을 위한 전체 공지사항입니다.</p>
                </div>
                {canWrite && (
                    <Link
                        href="/admin/notices/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        글쓰기
                    </Link>
                )}
            </div>

            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                <div className="min-w-full divide-y divide-slate-200">
                    <div className="bg-slate-50 hidden md:grid md:grid-cols-12 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <div className="px-6 py-3 col-span-1 text-center">번호</div>
                        <div className="px-6 py-3 col-span-6">제목</div>
                        <div className="px-6 py-3 col-span-2 text-center">작성자</div>
                        <div className="px-6 py-3 col-span-2 text-center">작성일</div>
                        <div className="px-6 py-3 col-span-1 text-center">조회</div>
                    </div>
                    <div className="bg-white divide-y divide-slate-200">
                        {notices.length === 0 ? (
                            <div className="px-6 py-8 text-center text-slate-500">등록된 공지사항이 없습니다.</div>
                        ) : (
                            notices.map((notice, index) => (
                                <Link
                                    href={`/admin/notices/${notice.id}`}
                                    key={notice.id}
                                    className="block hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex flex-col md:grid md:grid-cols-12 px-6 py-4 items-center">
                                        <div className="hidden md:block col-span-1 text-center text-sm text-slate-500">
                                            {notice.isImportant ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                    필독
                                                </span>
                                            ) : (
                                                totalCount - skip - index
                                            )}
                                        </div>
                                        <div className="w-full md:col-span-6 font-medium text-slate-900 mb-2 md:mb-0">
                                            {/* Mobile Label */}
                                            {notice.isImportant && <span className="md:hidden inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mr-2">필독</span>}
                                            {notice.title}
                                        </div>

                                        {/* Mobile Metadata Container */}
                                        <div className="w-full md:w-auto md:contents flex items-center text-xs text-slate-500 gap-4 mt-1 md:mt-0">
                                            <div className="md:col-span-2 md:text-center text-sm text-slate-500 flex items-center gap-1 justify-center">
                                                <User className="w-3 h-3 md:hidden" />
                                                {notice.author.name}
                                            </div>
                                            <div className="md:col-span-2 text-center text-sm text-slate-500 flex items-center gap-1 justify-center">
                                                <Calendar className="w-3 h-3 md:hidden" />
                                                {format(new Date(notice.createdAt), 'yyyy-MM-dd')}
                                            </div>
                                            <div className="md:col-span-1 text-center text-sm text-slate-400 flex items-center gap-1 justify-center">
                                                <Eye className="w-3 h-3 md:hidden" />
                                                {notice.views}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                    <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <Link
                                key={i + 1}
                                href={`/admin/notices?page=${i + 1}`}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                                    ${currentPage === i + 1
                                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                        : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                                    }
                                    ${i === 0 ? 'rounded-l-md' : ''}
                                    ${i === totalPages - 1 ? 'rounded-r-md' : ''}
                                `}
                            >
                                {i + 1}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </div>
    );
}
