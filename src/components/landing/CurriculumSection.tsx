'use client';

import { useState } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

export default function CurriculumSection() {
    // 탭 상태 (수학/영어)
    const [activeTab, setActiveTab] = useState<'math' | 'english'>('math');

    const strategies = [
        {
            num: "01",
            title: "학생별 맞춤 단계 수업",
            desc: "소수정예 시스템으로 개별 학습 수준에 맞는 선행/심화 과정 운영, 철저한 내신 대비와 오답 정리 관리"
        },
        {
            num: "02",
            title: "국제학교 특성화 강의",
            desc: "IB, A-Level, AP 등 국제 커리큘럼에 특화된 분반 수업과 전방위 관리 시스템, 1:1 논술 첨삭 및 온라인 질문 응답 지원"
        },
        {
            num: "03",
            title: "학년별 맞춤 커리큘럼",
            desc: "중2~고3까지 학년별 학습 목표와 필요에 따른 차별화된 커리큘럼 제공 (선행, 내신, 입시 집중반)"
        },
        {
            num: "04",
            title: "SAT · TOEFL 집중반 운영",
            desc: "현장 피드백 중심의 Clinic 수업, 목적별 시험 전략 반 구성, 고득점을 위한 전문 커리큘럼 운영"
        }
    ];

    const systems = [
        "입학 시 레벨 테스트 및 학습 목표 인터뷰로 개인 맞춤형 학습 플랜 수립",
        "학년, 학교, 과목별로 세분화된 반 구성 및 주간 단위 커리큘럼 조정",
        "정원제 운영을 통해 집중도 및 밀착 지도를 강화",
        "개별 오답 관리표 및 주간 모의고사, 수시평가로 학습 효율 극대화",
        "학생-강사 간 실시간 질문 가능, 과제 및 시험 준비 피드백 지원",
        "월별 리포트 제공으로 학생과 학부모가 학습 현황을 명확히 확인 가능"
    ];

    return (
        <section className="py-24 bg-slate-50" id="curriculum">

            {/* Header */}
            <div className="text-center max-w-4xl mx-auto mb-20 px-4">
                <h2 className="text-[#0055AB] font-bold text-sm tracking-widest uppercase mb-4">Curriculum</h2>
                <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-[1.3] break-keep">
                    서울학원만의 <br className="md:hidden" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0055AB] to-blue-400">
                        특성화된 커리큘럼
                    </span>을 소개합니다.
                </h3>
                <p className="text-lg text-slate-600 font-medium">
                    20년 이상 운영으로 검증된 특성화 교육과정 도입과<br className="hidden md:block" />
                    현장 수요 학습자 중심의 교육과정
                </p>
            </div>

            {/* Strategies Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
                <div className="flex justify-center mb-12">
                    <div className="relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-200 -z-10"></div>
                        <div className="bg-[#0055AB] text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-slate-50 mx-auto shadow-md">
                            1
                        </div>
                        <h4 className="text-xl font-bold text-[#0055AB] mt-4 text-center bg-slate-50 px-6">특성화된 강의 커리큘럼과 교수 전략</h4>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                    {strategies.map((item, idx) => (
                        <div key={idx} className="bg-[#0f4082] rounded-2xl p-8 text-white hover:-translate-y-1 transition-transform duration-300 shadow-lg">
                            <span className="text-4xl font-light text-blue-200/50 block mb-4">{item.num}</span>
                            <h5 className="text-xl font-bold mb-4">{item.title}</h5>
                            <p className="text-blue-100 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* System Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
                <div className="flex justify-center mb-12">
                    <div className="relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-200 -z-10"></div>
                        <div className="bg-[#0055AB] text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-slate-50 mx-auto shadow-md">
                            2
                        </div>
                        <h4 className="text-xl font-bold text-[#0055AB] mt-4 text-center bg-slate-50 px-6">시스템 구성</h4>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {systems.map((sys, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 hover:shadow-md transition-shadow">
                            <CheckCircle2 className="w-6 h-6 text-[#0055AB] flex-shrink-0 mt-0.5" />
                            <p className="text-slate-700 font-medium">{sys}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detailed Curriculum Tabs */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-center mb-12">
                    <div className="relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-200 -z-10"></div>
                        <div className="bg-[#0055AB] text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-slate-50 mx-auto shadow-md">
                            3
                        </div>
                        <h4 className="text-xl font-bold text-[#0055AB] mt-4 text-center bg-slate-50 px-6">세부 커리큘럼</h4>
                    </div>
                </div>

                {/* Tab Controls */}
                <div className="flex justify-center gap-4 mb-12">
                    <button
                        onClick={() => setActiveTab('math')}
                        className={`px-8 py-4 rounded-full font-bold text-lg transition-all ${activeTab === 'math'
                                ? 'bg-[#0055AB] text-white shadow-lg'
                                : 'bg-white text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        수학/과학 (Math/Science)
                    </button>
                    <button
                        onClick={() => setActiveTab('english')}
                        className={`px-8 py-4 rounded-full font-bold text-lg transition-all ${activeTab === 'english'
                                ? 'bg-[#0055AB] text-white shadow-lg'
                                : 'bg-white text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        영어 (English)
                    </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100">
                    {activeTab === 'math' ? (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* 고등수학 */}
                            <div>
                                <h5 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                    <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                                    고등 수학
                                </h5>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="border border-blue-100 rounded-xl overflow-hidden">
                                        <div className="bg-blue-50 px-6 py-3 font-bold text-[#0055AB] border-b border-blue-100text-center">고1 과정</div>
                                        <div className="p-6 bg-white space-y-2">
                                            <p className="text-slate-600 text-sm">• 다항식, 방정식과 부등식, 경우의 수, 행렬</p>
                                            <p className="text-slate-600 text-sm">• 도형, 집합과 명제, 함수</p>
                                        </div>
                                    </div>
                                    <div className="border border-blue-100 rounded-xl overflow-hidden">
                                        <div className="bg-blue-50 px-6 py-3 font-bold text-[#0055AB] border-b border-blue-100 text-center">고2 과정</div>
                                        <div className="p-6 bg-white space-y-2">
                                            <p className="text-slate-600 text-sm">• 대수 (지수와 로그, 삼각함수, 수열)</p>
                                            <p className="text-slate-600 text-sm">• 미적분1 (함수의 극한과 연속, 미분, 적분)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 인터수학 */}
                            <div>
                                <h5 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                    <span className="w-2 h-8 bg-teal-500 rounded-full"></span>
                                    Inter 수학 (International Math)
                                </h5>
                                <div className="space-y-4">
                                    {[
                                        { title: "입문반", rec: "G7 ~ G10", desc: "필수 수학 용어 해설, 기본 개념 정리 및 예제 적용법 학습 과정" },
                                        { title: "진도 선행반", rec: "G8 ~ G11", desc: "IB / AP / IGCSE 등 선행을 위한 진도 과정 학기 중 진행" },
                                        { title: "GPA 관리반", rec: "전 학년", desc: "주요 국제학교(UNIS/BIS/BVIS/ST.PAUL 등) 학기 중 평가 대비 관리" },
                                        { title: "시험 대비반", rec: "G11 ~ G12", desc: "IB Math AA HL, A-Level, AP Calculus, SAT 실전 문제풀이 및 오답 클리닉" },
                                        { title: "경시 준비반", rec: "선발형", desc: "국제 경시대회 (AMC, UKMT, AIMO 등) 기출 풀이 및 심화 유형 학습반" }
                                    ].map((inter, i) => (
                                        <div key={i} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                                            <div className="md:w-1/4">
                                                <span className="inline-block px-3 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-full mb-2">{inter.rec} 추천</span>
                                                <h6 className="font-bold text-slate-800">{inter.title}</h6>
                                            </div>
                                            <div className="md:w-3/4 flex items-center">
                                                <p className="text-slate-600 text-sm">{inter.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h5 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                    <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                                    SAT 및 공인영어 준비반
                                </h5>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-purple-50 p-8 rounded-2xl border border-purple-100">
                                        <h6 className="text-xl font-bold text-purple-900 mb-4">SAT Readiness</h6>
                                        <ul className="space-y-3 text-sm text-purple-800">
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>영역별 문제유형 분석 및 풀이 전략 학습</li>
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>매주 실전 모의고사 하프/풀 테스트 진행</li>
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>필수 어휘 10,000+ 암기 트레이닝</li>
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>에세이 구조화 및 1:1 첨삭 지도</li>
                                        </ul>
                                    </div>
                                    <div className="bg-indigo-50 p-8 rounded-2xl border border-indigo-100">
                                        <h6 className="text-xl font-bold text-indigo-900 mb-4">TOEFL iBT 실전반</h6>
                                        <ul className="space-y-3 text-sm text-indigo-800">
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>Reading/Listening 실전 훈련 및 노트테이킹</li>
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>Speaking/Writing 최적화 템플릿 학습</li>
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>스피킹 녹음 피드백 및 발음 교정</li>
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>정기 모의고사를 통한 취약점 파악</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </section>
    );
}
