import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ArrowRight, Calendar, Eye, Megaphone } from "lucide-react";
import Link from "next/link";

export default async function FeaturedNotice() {
    // 최근 등록된 10개의 공지사항을 불러옴
    const recentNotices = await prisma.notice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { attachments: true }
    });

    let featuredNotice = null;
    let featuredImageUrl = null;

    // 10개의 공지사항 중 이미지가 있는 첫 번째 공지사항을 찾음
    for (const notice of recentNotices) {
        // 1. 첨부파일 중 이미지 매칭
        const imgAtt = notice.attachments.find(att => 
            /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(att.url)
        );
        if (imgAtt) {
            featuredNotice = notice;
            featuredImageUrl = imgAtt.url;
            break;
        }
        // 2. 에디터 본문 내용 중 <img> 태그 매칭
        const imgMatch = notice.content.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
            featuredNotice = notice;
            featuredImageUrl = imgMatch[1];
            break;
        }
    }

    // 만약 이미지가 포함된 최근 공지사항이 없다면 아무것도 렌더링하지 않음
    if (!featuredNotice || !featuredImageUrl) {
        return null;
    }

    // 본문 내용 요약본 추출 (HTML 태그 제거)
    const textPreview = featuredNotice.content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 160) + (featuredNotice.content.length > 160 ? '...' : '');

    return (
        <section className="py-20 bg-white border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
                    
                    {/* 이미지 영역 */}
                    <div className="lg:col-span-5 mb-8 lg:mb-0">
                        <Link href={`/admin/notices/${featuredNotice.id}`} className="block overflow-hidden rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-shadow group bg-slate-50 flex items-center justify-center h-[320px] md:h-[500px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={featuredImageUrl} 
                                alt={featuredNotice.title}
                                className="max-w-full max-h-full object-contain group-hover:scale-102 transition-transform duration-500 ease-out"
                            />
                        </Link>
                    </div>

                    {/* 텍스트 내용 영역 */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex bg-blue-50 text-[#0055AB] text-xs font-bold px-3 py-1 rounded-md border border-blue-100 items-center gap-1.5">
                                <Megaphone className="w-3.5 h-3.5 text-blue-600" /> 최신 소식
                            </span>
                            {featuredNotice.isImportant && (
                                <span className="inline-flex bg-red-50 text-red-700 text-xs font-bold px-3 py-1 rounded-md border border-red-100">
                                    필독
                                </span>
                            )}
                        </div>

                        <h4 className="text-2xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight hover:text-[#0055AB] transition-colors">
                            <Link href={`/admin/notices/${featuredNotice.id}`}>
                                {featuredNotice.title}
                            </Link>
                        </h4>

                        <div className="flex items-center gap-4 text-sm text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(featuredNotice.createdAt), 'yyyy년 MM월 dd일')}
                            </span>
                            <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                조회 {featuredNotice.views}
                            </span>
                        </div>

                        <p className="text-slate-600 text-[15px] md:text-base leading-relaxed break-all line-clamp-3">
                            {textPreview}
                        </p>

                        <div className="pt-4">
                            <Link
                                href={`/admin/notices/${featuredNotice.id}`}
                                className="inline-flex items-center px-6 py-3 bg-[#0055AB] hover:bg-blue-800 text-white font-bold rounded-full transition-all hover:shadow-md gap-2"
                            >
                                공지사항 자세히 보기
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
