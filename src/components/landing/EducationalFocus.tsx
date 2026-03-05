import { CheckCircle2, UserCheck, Globe2, Layers, Award } from "lucide-react";

export default function EducationalFocus() {
    const systems = [
        {
            icon: <UserCheck className="w-8 h-8 text-[#0055AB]" />,
            title: "학생별 맞춤식 단계 수업",
            points: [
                "소수정예 학습 시스템으로 개별 학습 맞춤 진행",
                "수준별 학습을 통한 예습 및 복습 효과의 극대화",
                "철저한 내신 관리 및 오답 분석을 통한 완벽한 시험 대비"
            ]
        },
        {
            icon: <Globe2 className="w-8 h-8 text-[#0055AB]" />,
            title: "국제학교 특성화 전문 집중강의",
            points: [
                "IB, A-Level, AP 등 국제학교 교육과정 완벽 분석 및 전문 강의",
                "전공별 세분화된 맞춤형 강의 및 전방위적 관리 시스템",
                "1:1 에세이 첨삭 지도 및 온라인 질의응답을 통한 학습 공백 최소화"
            ]
        },
        {
            icon: <Layers className="w-8 h-8 text-[#0055AB]" />,
            title: "학년별 맞춤 커리큘럼 구성",
            points: [
                "중2부터 고3까지 학년별 학습 목표 및 수준에 최적화된 로드맵 제시",
                "수강생의 니즈에 따른 선행학습, 내신대비, 입시 집중 과정 구성 및 운영"
            ]
        },
        {
            icon: <Award className="w-8 h-8 text-[#0055AB]" />,
            title: "SAT/TOEFL Novice부터 Master까지 구성",
            points: [
                "현장 피드백 중심의 클리닉 수업 등 검증된 커리큘럼 기반의 체계적 학습",
                "목표 점수 달성을 위한 목적별 수시 개설 특강 및 성적 향상 노하우 제공",
                "고득점 확보를 위한 전문 강사진의 독보적인 학습 전략 노하우 전수"
            ]
        }
    ];

    return (
        <section className="py-24 bg-white" id="about">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Intro / Philosophy */}
                <div className="text-center max-w-4xl mx-auto mb-20">
                    <h2 className="text-[#0055AB] font-bold text-sm tracking-widest uppercase mb-4">About Us</h2>
                    <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-[1.3] break-keep">
                        우리 학원은 <br className="md:hidden" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0055AB] to-blue-400">
                            이렇게 가르칩니다.
                        </span>
                    </h3>

                    <div className="bg-slate-50 p-8 md:p-12 rounded-3xl border border-slate-100 shadow-sm relative mt-12">
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-[#0055AB] text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                            1
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900 mb-6 mt-4">서울학원은...</h4>
                        <p className="text-lg text-slate-600 leading-relaxed font-medium">
                            수업을 듣기만 한다고 해서 실력이 오르는 건 아닙니다. <br className="hidden md:block" />
                            핵심적인 내용을 빠르고 정확하게 가르치고, 학생이 이해하고 활용할 수 있도록 합니다. <br className="hidden md:block" />
                            꾸준히 능력을 키우면서 실력과 성적을 향상시킬 수 있도록 돕겠습니다.
                        </p>
                    </div>
                </div>

                {/* System / 4 Steps */}
                <div className="relative pt-12">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-[#0055AB] text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg z-10">
                        2
                    </div>

                    <div className="text-center mb-16 pt-8">
                        <h4 className="text-3xl font-bold text-slate-900">
                            서울학원만의 <span className="text-[#0055AB]">성적관리시스템</span>은 이렇습니다
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        {systems.map((sys, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-4 bg-blue-50 rounded-xl group-hover:bg-[#0055AB] group-hover:text-white transition-colors">
                                        {/* Clone element to override color on hover if needed, but styling parent is easier */}
                                        <div className="text-[#0055AB] group-hover:text-white transition-colors">
                                            {sys.icon}
                                        </div>
                                    </div>
                                    <h5 className="text-xl font-bold text-slate-900 leading-tight">
                                        <span className="text-[#0055AB] block text-sm font-bold mb-1 opacity-80">0{idx + 1}</span>
                                        {sys.title}
                                    </h5>
                                </div>
                                <ul className="space-y-4">
                                    {sys.points.map((point, pIdx) => (
                                        <li key={pIdx} className="flex items-start gap-3">
                                            <div className="mt-1.5 flex-shrink-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                            </div>
                                            <p className="text-slate-600 font-medium leading-relaxed">
                                                {point}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
}
