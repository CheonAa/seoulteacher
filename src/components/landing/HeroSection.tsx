import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-[#0055AB]">
            {/* Abstract Background pattern mimicking the reference site */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-cyan-300 rounded-full blur-3xl"></div>
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-medium mb-8 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse"></span>
                    하노이 최고 수준의 강사진
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight drop-shadow-sm">
                    <span className="block mb-2">하노이 서울학원</span>
                </h1>

                <p className="mt-8 text-lg md:text-xl text-blue-100 max-w-2xl mx-auto font-medium leading-relaxed">
                    성적 향상을 넘어 학생의 미래를 설계합니다. <br className="hidden md:block" />
                    국제학교, 로컬학교 맞춤형 집중 내신 관리 및 입시 컨설팅.
                </p>

                <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a
                        href="#curriculum"
                        className="group px-8 py-4 bg-white text-[#0055AB] rounded-full font-bold text-lg hover:bg-slate-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        프로그램 알아보기
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <Link
                        href="/login"
                        className="px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-colors"
                    >
                        수강생 로그인
                    </Link>
                </div>
            </div>

            {/* Decorative slant bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent"></div>
        </section>
    );
}
