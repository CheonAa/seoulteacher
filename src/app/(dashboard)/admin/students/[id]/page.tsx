import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, Phone, MapPin, GraduationCap, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import StudentConsultationBoard from './StudentConsultationBoard';
import StudentAttendanceCalendar from '@/components/StudentAttendanceCalendar';

export const metadata: Metadata = {
    title: '학생 상세 정보 | 관리자 대시보드',
};

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Load student data
    const student = await prisma.student.findUnique({
        where: { id: id },
        include: {
            parents: true,
            enrollments: {
                include: {
                    instructor: {
                        select: { name: true }
                    }
                }
            },
        }
    });

    if (!student) {
        notFound();
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const enrollmentIds = student.enrollments.map(e => e.id);
    const billings = await prisma.monthlyBilling.findMany({
        where: {
            enrollmentId: { in: enrollmentIds },
            year: currentYear,
            month: currentMonth
        }
    });

    if (!student) {
        notFound();
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/students"
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <span className="text-blue-600">{student.name}</span> 학생 상세 정보
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">학생의 기본 정보, 수강 내역 및 상담 기록을 확인합니다.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                    {(session.user.role === 'OWNER' || session.user.role === 'ADMIN' || student.creatorId === session.user.id || student.enrollments.some(e => e.instructor.name && e.instructor.name === session.user.name)) && (
                        <Link 
                            href={`/admin/students/${student.id}/edit`}
                            className="bg-white w-full sm:w-auto text-center px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                        >
                            정보 수정
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Info & Enrollments */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Basic Info Card */}
                    <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-emerald-600" />
                            <h2 className="font-semibold text-slate-800">기본 정보</h2>
                        </div>
                        <div className="p-5 space-y-4 text-sm">
                            <div className="flex items-start gap-3">
                                <GraduationCap className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <div className="font-medium text-slate-700">학교 / 학년</div>
                                    <div className="text-slate-600 mt-0.5">{student.school || '-'} <span className="text-slate-400">|</span> {student.grade || '-'}학년</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <div className="font-medium text-slate-700">연락처</div>
                                    <div className="text-slate-600 mt-0.5">{student.phone || '-'}</div>
                                    {student.parents.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {student.parents.map(p => (
                                                <div key={p.id} className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
                                                    <span className="font-medium">{p.relation || '학부모'} {p.name}</span>: {p.phone}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {student.shuttleStatus === 'BOARDING' && student.shuttleLocation && (
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-slate-700">차량 탑승 정보</div>
                                        <div className="text-blue-600 font-medium mt-0.5 text-xs bg-blue-50 px-2 py-1 rounded inline-block">{student.shuttleLocation}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Enrollments Card */}
                    <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            <h2 className="font-semibold text-slate-800">수강 내역 ({student.enrollments.length}과목)</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            {student.enrollments.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded border border-dashed border-slate-200">등록된 수강 과목이 없습니다.</p>
                            ) : (
                                student.enrollments.map(env => {
                                    const billing = billings.find(b => b.enrollmentId === env.id);
                                    let remainingSessions = 0;
                                    let attendedSessions = 0;
                                    let targetSessionsTotal = env.targetSessionsMonth; // default

                                    if (billing) {
                                        attendedSessions = billing.attendedSessions;
                                        targetSessionsTotal = billing.carryOverSessions + billing.attendedSessions;
                                        remainingSessions = billing.carryOverSessions;
                                    }

                                    return (
                                        <div key={env.id} className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all relative overflow-hidden">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${env.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                            <div className="flex justify-between items-start mb-2 pl-2">
                                                <h3 className="font-bold text-slate-800">{env.subjectName}</h3>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${env.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                                    {env.status === 'ACTIVE' ? '수강중' : env.status}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 pl-2 text-xs">
                                                <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded text-slate-600">
                                                    <span className="font-medium flex items-center gap-1.5"><User className="w-3 h-3 text-slate-400" /> 담당 강사</span>
                                                    <span className="font-semibold text-slate-800">{env.instructor.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-600 px-2 py-1">
                                                    <span className="font-medium flex items-center gap-1.5"><CreditCard className="w-3 h-3 text-slate-400" /> 수강료/기본횟수</span>
                                                    <span>{env.feePerSession.toLocaleString()} ₫ <span className="text-slate-400">×</span> {env.targetSessionsMonth}회</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-600 px-2 py-1 border-b border-slate-100/50 pb-2 mb-2">
                                                    <span className="font-medium flex items-center gap-1.5"><CreditCard className="w-3 h-3 text-slate-400" /> 이번 달 납부 현황</span>
                                                    {billing ? (
                                                        billing.isPaid ? (
                                                            <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-100">납부 완료 ({format(new Date(billing.paidAt!), 'MM/dd')})</span>
                                                        ) : billing.targetSessions === 0 ? (
                                                            <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">납부 불필요 (이월)</span>
                                                        ) : (
                                                            <span className="text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded text-[11px] border border-red-100">미납 (납부 필요)</span>
                                                        )
                                                    ) : (
                                                        <span className="text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded text-xs border border-slate-200">청구 전</span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center px-2 py-1.5 bg-blue-50/50 rounded border border-blue-100">
                                                    <span className="font-medium text-slate-700 flex items-center gap-1.5">이번 달 출석 잔여</span>
                                                    <div className="text-right">
                                                        <div className="font-bold text-slate-700">{attendedSessions} / {targetSessionsTotal}회</div>
                                                        <div className={`font-semibold ${remainingSessions === 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                                            {remainingSessions === 0 ? '수업 완료' : `잔여 ${remainingSessions}회`}
                                                        </div>
                                                    </div>
                                                </div>
                                                {env.depositorName && (
                                                    <div className="flex justify-between items-center text-slate-600 px-2 py-1">
                                                        <span className="font-medium flex items-center gap-1.5"><CreditCard className="w-3 h-3 text-slate-400" /> 입금자명</span>
                                                        <span className="text-blue-600 font-medium bg-blue-50 px-1.5 rounded">{env.depositorName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Consultation Board */}
                <div className="lg:col-span-2 space-y-6">
                    <StudentAttendanceCalendar studentId={student.id} />
                    <StudentConsultationBoard 
                        studentId={student.id} 
                        currentUserId={session.user.id} 
                        currentUserRole={session.user.role} 
                    />
                </div>
            </div>
        </div>
    );
}
