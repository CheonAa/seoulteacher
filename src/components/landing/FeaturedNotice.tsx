import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ArrowRight, Calendar, Eye, Megaphone } from "lucide-react";
import Link from "next/link";

interface FeaturedNoticeItem {
    notice: any;
    imageUrl: string;
}

export default async function FeaturedNotice() {
    // 최근 등록된 15개의 공지사항을 불러와서 이미지 포함된 건을 추출
    const recentNotices = await prisma.notice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { attachments: true }
    });

    const featuredNotices: FeaturedNoticeItem[] = [];

    // 공지사항 중 이미지가 있는 최대 2개의 공지사항을 찾음
    for (const notice of recentNotices) {
        if (featuredNotices.length >= 2) break;

        // 1. 첨부파일 중 이미지 매칭
        const imgAtt = notice.attachments.find(att => 
            /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(att.url)
        );
        if (imgAtt) {
            featuredNotices.push({ notice, imageUrl: imgAtt.url });
            continue;
        }
        // 2. 에디터 본문 내용 중 <img> 태그 매칭
        const imgMatch = notice.content.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
            featuredNotices.push({ notice, imageUrl: imgMatch[1] });
            continue;
        }
    }

    // 만약 이미지가 포함된 공지사항이 없다면 아무것도 렌더링하지 않음
    if (featuredNotices.length === 0) {
        return null;
    }

    return (
        <section className="py-24 bg-white border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-16 space-y-3">
                    <span className="inline-flex bg-blue-50 text-[#0055AB] text-xs font-bold px-3 py-1 rounded-md border border-blue-100 items-center gap-1.5">
                        <Megaphone className="w-3.5 h-3.5 text-blue-600 animate-bounce" /> 최신 새소식
                    </span>
                    <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                        서울학원 공지사항
                    </h3>
                    <p className="text-slate-500 text-sm max-w-lg mx-auto font-medium">
                        학원의 다양한 소식과 포스터 및 안내문을 실시간으로 확인하실 수 있습니다.
                    </p>
                </div>

                {/* Grid Layout */}
                <div className={`grid grid-cols-1 gap-10 ${featuredNotices.length === 2 ? 'md:grid-cols-2' : 'max-w-3xl mx-auto'}`}>
                    {featuredNotices.map(({ notice, imageUrl }) => {
                        // 본문 내용 요약본 추출 (HTML 태그 제거)
                        const textPreview = notice.content
                            .replace(/<[^>]*>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 160) + (notice.content.length > 160 ? '...' : '');

                        return (
                            <div key={notice.id} className="bg-white rounded-3xl overflow-hidden border border-slate-200/60 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group">
                                
                                {/* Poster Image container */}
                                <Link 
                                    href={`/admin/notices/${notice.id}`} 
                                    className="block overflow-hidden bg-slate-50 flex items-center justify-center h-[320px] md:h-[480px] border-b border-slate-100 relative"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={imageUrl} 
                                        alt={notice.title}
                                        className="max-w-full max-h-full object-contain group-hover:scale-[1.01] transition-transform duration-500 ease-out"
                                    />
                                    {notice.isImportant && (
                                        <span className="absolute top-4 left-4 inline-flex bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider">
                                            필독
                                        </span>
                                    )}
                                </Link>

                                {/* Content Details */}
                                <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {format(new Date(notice.createdAt), 'yyyy년 MM월 dd일')}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Eye className="w-4 h-4 text-slate-400" />
                                                조회 {notice.views}
                                            </span>
                                        </div>

                                        <h4 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug line-clamp-1 group-hover:text-[#0055AB] transition-colors">
                                            <Link href={`/admin/notices/${notice.id}`}>
                                                {notice.title}
                                            </Link>
                                        </h4>

                                        <p className="text-slate-600 text-sm md:text-[15px] leading-relaxed line-clamp-3">
                                            {textPreview}
                                        </p>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <Link
                                            href={`/admin/notices/${notice.id}`}
                                            className="inline-flex items-center text-sm font-bold text-[#0055AB] hover:text-blue-800 transition-colors gap-1"
                                        >
                                            상세 보기 <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>

                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
