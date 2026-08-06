'use client';

import { useState } from 'react';
import { 
    CheckCircle2, 
    BookOpen, 
    Award, 
    CheckSquare, 
    Sparkles, 
    Clock, 
    GraduationCap,
    TrendingUp
} from 'lucide-react';

export default function CurriculumSection() {
    // 탭 상태 (수학/영어)
    const [activeTab, setActiveTab] = useState<'math' | 'english'>('math');

    const strategies = [
        {
            num: "01",
            title: "1:1 밀착 피드백 및 개별 오답 클리닉",
            desc: "진단 테스트를 통한 철저한 약점 분석 및 매주 진행되는 수준별 오답 노트 관리로 빈틈없는 학습 습관 형성"
        },
        {
            num: "02",
            title: "IB / A-Level 전문 국제학교 커리큘럼",
            desc: "UNIS, BIS, BVIS 등 하노이 현지 명문 국제학교별 맞춤형 진도 선행, GPA 관리 및 실전 파이널 대비 특화"
        },
        {
            num: "03",
            title: "중·고등 국내 내신 완벽 대비",
            desc: "KISH(한국국제학교) 및 한국 내신 출제 경향을 분석한 단계별 개념 정리와 고난도 문제풀이 집중 훈련"
        },
        {
            num: "04",
            title: "상시 입학 상담 및 대기 등록 시스템",
            desc: "상시 상담을 통한 개인별 학습 진단 및 철저한 소수정예 운영으로 각 반 정원 마감 시 대기 등록 지원"
        }
    ];

    const systems = [
        "입학 시 개별 실력 및 취약점 파악을 위한 진단 테스트 실시",
        "학년, 학교, 레벨별로 세분화된 소수정예 정원제 반 구성",
        "개념 이해부터 유형 적용, 서술형 대비까지 탄탄한 단계별 학습",
        "개별 오답 노트 피드백 클리닉으로 약점 집중 반복 보완",
        "주간 과제 테스트 및 정기 모의평가를 통한 실시간 학습 흐름 관리",
        "학교별(UNIS/BIS/BVIS/KISH 등) 내신/특례 완벽 분석 맞춤 교재 제공"
    ];

    return (
        <section className="py-24 bg-slate-50" id="curriculum">

            {/* Header */}
            <div className="text-center max-w-4xl mx-auto mb-20 px-4">
                <h2 className="text-[#0055AB] font-bold text-sm tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> CURRICULUM
                </h2>
                <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-[1.3] break-keep">
                    하노이 서울학원만의 <br className="md:hidden" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0055AB] to-blue-400">
                        성적이 오르는 맞춤 교육과정
                    </span>을 소개합니다.
                </h3>
                <p className="text-lg text-slate-600 font-medium">
                    체계적인 교육으로 미래를 준비하는 초·중·고 전학년 신입생 모집<br className="hidden md:block" />
                    개인별 맞춤 학습과 꼼꼼한 관리로 성적 향상과 올바른 공부 습관을 완성합니다.
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
                        <h4 className="text-xl font-bold text-[#0055AB] mt-4 text-center bg-slate-50 px-6">서울학원만의 4대 교수 전략</h4>
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
                        <h4 className="text-xl font-bold text-[#0055AB] mt-4 text-center bg-slate-50 px-6">수업 진행 방식 및 관리 시스템</h4>
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-center mb-12">
                    <div className="relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-200 -z-10"></div>
                        <div className="bg-[#0055AB] text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-slate-50 mx-auto shadow-md">
                            3
                        </div>
                        <h4 className="text-xl font-bold text-[#0055AB] mt-4 text-center bg-slate-50 px-6">과목별 세부 교육과정</h4>
                    </div>
                </div>

                {/* Tab Controls */}
                <div className="flex justify-center gap-4 mb-12">
                    <button
                        onClick={() => setActiveTab('math')}
                        className={`px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-2 ${activeTab === 'math'
                                ? 'bg-[#0055AB] text-white shadow-lg'
                                : 'bg-white text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        <Award className="w-5 h-5" /> 수학 (Math)
                    </button>
                    <button
                        onClick={() => setActiveTab('english')}
                        className={`px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-2 ${activeTab === 'english'
                                ? 'bg-[#0055AB] text-white shadow-lg'
                                : 'bg-white text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        <BookOpen className="w-5 h-5" /> 영어 (English)
                    </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-3xl p-6 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100">
                    {activeTab === 'math' ? (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* 초중등 수학 */}
                            <div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                    <h5 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                        <span className="w-2 h-8 bg-teal-500 rounded-full"></span>
                                        초등·중등 수학
                                    </h5>
                                    <span className="text-teal-600 bg-teal-50 text-xs px-3 py-1.5 font-semibold rounded-full mt-2 md:mt-0 self-start md:self-auto">
                                        모집 대상: 초등 ~ 중등 (학년별·레벨별 반 운영 / 소수 정원제)
                                    </span>
                                </div>
                                <div className="grid md:grid-cols-4 gap-4">
                                    {[
                                        { step: "Step 01", title: "진단 테스트", desc: "개별 진단 테스트를 진행하여 현재 실력과 보완해야 할 약점을 면밀히 체크" },
                                        { step: "Step 02", title: "단계별 핵심 학습", desc: "개념 확립부터 유형 분석, 서술형 주관식 대비까지 점진적인 실력 강화" },
                                        { step: "Step 03", title: "오답 노트 클리닉", desc: "오답 오답노트를 전담 강사가 직접 일일이 피드백하고 취약 유형 집중 반복 보완" },
                                        { step: "Step 04", title: "주간 과제 & 테스트", desc: "주 단위 과제 성취도 측정 및 테스트를 통해 체계적인 학습 습관 완벽 관리" }
                                    ].map((mathStep, idx) => (
                                        <div key={idx} className="border border-teal-100 rounded-2xl p-6 bg-teal-50/20 hover:bg-white hover:shadow-md transition-all">
                                            <span className="text-xs font-bold text-teal-600 tracking-wider uppercase">{mathStep.step}</span>
                                            <h6 className="font-bold text-slate-800 text-lg mt-1 mb-3">{mathStep.title}</h6>
                                            <p className="text-slate-600 text-sm leading-relaxed">{mathStep.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 고등 수학 */}
                            <div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                    <h5 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                        <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                                        고등 수학 실력UP 집중 과정
                                    </h5>
                                    <span className="text-blue-600 bg-blue-50 text-xs px-3 py-1.5 font-semibold rounded-full mt-2 md:mt-0 self-start md:self-auto">
                                        모집 대상: 예비 고1 ~ 고3 (새 학기 신규 등록반 운영)
                                    </span>
                                </div>
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                        <div>
                                            <div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full w-max mb-4">교육 내용</div>
                                            <h6 className="text-xl font-bold text-slate-800 mb-4">고등 수학 전 과정 개설</h6>
                                            <p className="text-slate-600 text-sm leading-relaxed mb-4">새 교과과정에 맞춘 고등 핵심 대단원 학습 구성</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2">
                                            <p className="text-slate-700 text-sm font-semibold">공통수학1, 2</p>
                                            <p className="text-slate-700 text-sm font-semibold">대수, 미적분1, 2</p>
                                            <p className="text-slate-700 text-sm font-semibold">확률과 통계</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                                        <div className="bg-[#0055AB] text-white text-xs font-bold px-3 py-1 rounded-full w-max mb-4">집중 관리</div>
                                        <h6 className="text-xl font-bold text-slate-800 mb-4">완성형 집중 프로그램</h6>
                                        <ul className="space-y-3.5 text-slate-600 text-sm">
                                            <li className="flex items-start gap-2.5">
                                                <CheckSquare className="w-5 h-5 text-[#0055AB] flex-shrink-0 mt-0.5" />
                                                <span>기본 개념 철저 복습 + 응용 연습</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <CheckSquare className="w-5 h-5 text-[#0055AB] flex-shrink-0 mt-0.5" />
                                                <span>1:1 밀착 피드백 및 꼼꼼한 개인 진도 체크</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <CheckSquare className="w-5 h-5 text-[#0055AB] flex-shrink-0 mt-0.5" />
                                                <span>취약 유형 정밀 진단 및 반복 문제 풀이</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="bg-[#0f4082] text-white p-8 rounded-2xl shadow-lg">
                                        <div className="bg-blue-300 text-slate-900 text-xs font-bold px-3 py-1 rounded-full w-max mb-4">상위권 도약</div>
                                        <h6 className="text-xl font-bold mb-4">상위권 완벽 대비반</h6>
                                        <p className="text-blue-100 text-sm leading-relaxed mb-6">
                                            상위권 등극 및 1등급 유지를 목표로 고난도 킬러 문항 및 서술형 문제를 집중 반복하여 실전 감각을 극대화합니다.
                                        </p>
                                        <div className="border-t border-blue-800 pt-4 mt-auto">
                                            <span className="text-xs text-blue-200">심화 학습 / 특례 및 수능 대비반 연계</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 인터수학 */}
                            <div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                                        <h5 className="text-2xl font-bold text-slate-900">
                                            IB · A-Level 전문 인터 수학
                                        </h5>
                                    </div>
                                    <span className="text-purple-600 bg-purple-50 text-xs px-3 py-1.5 font-semibold rounded-full mt-2 md:mt-0 self-start md:self-auto flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" /> 하노이 경력 9년, 10,000시간 이상의 독보적 강사진 강의
                                    </span>
                                </div>
                                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-purple-100 rounded-2xl p-6 bg-purple-50/10">
                                        <h6 className="font-bold text-purple-950 mb-3 flex items-center gap-2">
                                            <GraduationCap className="w-5 h-5 text-purple-600" /> IB 과정 맞춤 대비 (UNIS, BIS, HIS, RGSV 등)
                                        </h6>
                                        <p className="text-slate-600 text-sm leading-relaxed">• IB Final 3개반 (수금, 토일A, 토일B)</p>
                                        <p className="text-slate-600 text-sm leading-relaxed">• IB 진도 2개반 (화목A, 화목B)</p>
                                    </div>
                                    <div className="border border-indigo-100 rounded-2xl p-6 bg-indigo-50/10">
                                        <h6 className="font-bold text-indigo-950 mb-3 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-indigo-600" /> A-Level & 연계 과정 (BVIS, ISPH, ANS 등)
                                        </h6>
                                        <p className="text-slate-600 text-sm leading-relaxed">• A-Level 진도 1개반 (토일)</p>
                                        <p className="text-slate-600 text-sm leading-relaxed">• 연계 및 중등 과정: MYP, IGCSE 진도 2개반 (화목, 토일)</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { title: "인터 입문반 (G7 ~ G10)", desc: "국제학교 수학에 처음 입문하는 학생을 위해 필수 수학 용어 해설, 기본 개념 및 연산 예제 완벽 마스터 과정" },
                                        { title: "진도 선행반 (G8 ~ G11)", desc: "방학 및 학기 중에 진행되는 IB / AP / IGCSE 등 선행을 위한 진도 집중 학습 과정" },
                                        { title: "GPA 내신 대비반 (전 학년)", desc: "UNIS, BIS, BVIS, ST.PAUL 등 주요 국제학교 학기 중 학교별 수시 시험 및 과제 대비 밀착 관리" },
                                        { title: "실전 시험 준비반 (G11 ~ G12)", desc: "IB Math AA/AI HL, A-Level, AP Calculus, SAT 실전 기출 문항 분석 및 1:1 오답 클리닉 중심의 끝장내기 과정" }
                                    ].map((inter, i) => (
                                        <div key={i} className="flex flex-col md:flex-row gap-4 p-5 border border-slate-100 rounded-xl bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                                            <div className="md:w-1/3">
                                                <h6 className="font-bold text-slate-800 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                                                    {inter.title}
                                                </h6>
                                            </div>
                                            <div className="md:w-2/3 flex items-center">
                                                <p className="text-slate-600 text-sm">{inter.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* 중고등 내신 영어 */}
                            <div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                    <h5 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                        <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                                        중등·고등 내신 전문 영어
                                    </h5>
                                    <span className="text-purple-600 bg-purple-50 text-xs px-3 py-1.5 font-semibold rounded-full mt-2 md:mt-0 self-start md:self-auto flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> 매주 화요일 · 목요일 수업 진행
                                    </span>
                                </div>
                                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                    **초등 4학년부터 고등학교 3학년**까지 KISH(한국국제학교), KGS 및 한국 중고등학교 내신을 확실하게 책임지는 커리큘럼입니다.
                                    개념 이해부터 문제 적용 단계까지 성적 향상을 위한 맞춤형 지도 방식을 고수합니다.
                                </p>
                                <div className="grid md:grid-cols-4 gap-6">
                                    {[
                                        { title: "핵심 개념 완성", desc: "영문법 및 구문 독해의 핵심 개념부터 근본적인 원리 이해까지 체계적 완성" },
                                        { title: "학교별 내신 대비", desc: "학교별 시험 기출 유형 분석 및 단원별 예상/변형 문제 집중 풀이" },
                                        { title: "실전 문제풀이", desc: "고난도 및 서술형 평가 대비까지 변별력 있는 고배점 문제 탄탄히 준비" },
                                        { title: "1:1 맞춤 관리", desc: "소수 정원제로 개개인의 수준에 맞춘 밀착 단어 암기 및 오답 완벽 케어" }
                                    ].map((engCore, idx) => (
                                        <div key={idx} className="bg-purple-50/20 border border-purple-100 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all">
                                            <div className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded w-max mb-3">0{idx + 1}</div>
                                            <h6 className="font-bold text-slate-800 text-lg mb-2">{engCore.title}</h6>
                                            <p className="text-slate-600 text-xs leading-relaxed">{engCore.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SAT 및 공인 영어 */}
                            <div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                    <h5 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                        <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                                        SAT 및 공인영어 준비반 (특례 대비)
                                    </h5>
                                    <span className="text-indigo-600 bg-indigo-50 text-xs px-3 py-1.5 font-semibold rounded-full mt-2 md:mt-0 self-start md:self-auto">
                                        대상: 글로벌 대학 및 한국 특례 입학 대비 집중 과정
                                    </span>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-purple-50/50 p-8 rounded-2xl border border-purple-100">
                                        <h6 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-purple-600" /> SAT Readiness
                                        </h6>
                                        <ul className="space-y-3 text-sm text-purple-800">
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>영역별 문제유형 분석 및 풀이 전략 학습</li>
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>매주 실전 모의고사 하프/풀 테스트 진행</li>
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>필수 어휘 10,000+ 암기 트레이닝</li>
                                            <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>에세이 구조화 및 1:1 첨삭 지도</li>
                                        </ul>
                                    </div>
                                    <div className="bg-indigo-50/50 p-8 rounded-2xl border border-indigo-100">
                                        <h6 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-indigo-600" /> TOEFL iBT 실전반
                                        </h6>
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
