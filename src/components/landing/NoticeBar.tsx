import { Megaphone, ChevronRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export default async function NoticeBar() {
    // Fetch top 3 notices. Prioritize important ones, then newest.
    const notices = await prisma.notice.findMany({
        orderBy: [
            { isImportant: 'desc' },
            { createdAt: 'desc' }
        ],
        take: 3,
        select: {
            id: true,
            title: true,
            isImportant: true,
            createdAt: true,
        }
    });

    if (notices.length === 0) {
        return null; // Don't show the bar if there are no notices
    }

    return (
        <div className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between py-4 gap-4 sm:gap-6">

                    {/* Badge Column */}
                    <div className="flex-shrink-0 pt-0.5">
                        <span className="inline-flex bg-blue-50 text-[#0055AB] text-xs font-bold px-3 py-1 rounded-md border border-blue-100 items-center gap-1">
                            <Megaphone className="w-3 h-3" />
                            공지사항
                        </span>
                    </div>

                    {/* Notices List Column */}
                    <div className="flex-1 overflow-hidden flex flex-col gap-2">
                        {notices.map((notice: any) => (
                            <Link
                                key={notice.id}
                                href={`/login?callbackUrl=/admin/notices/${notice.id}`}
                                className="group flex items-center justify-between"
                            >
                                <p className="text-sm font-medium text-slate-700 truncate group-hover:text-[#0055AB] cursor-pointer transition-colors max-w-[85%]">
                                    {notice.isImportant && <span className="text-red-500 font-bold mr-2">[필독]</span>}
                                    {notice.title}
                                </p>
                                <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">
                                    {format(notice.createdAt, 'yyyy.MM.dd')}
                                </span>
                            </Link>
                        ))}
                    </div>

                    {/* View All Button */}
                    <Link
                        href="/login?callbackUrl=/admin/notices"
                        className="flex-shrink-0 flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors self-start sm:self-center bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200"
                    >
                        전체보기 <ChevronRight className="w-4 h-4 ml-0.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
