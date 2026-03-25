import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { UserCheck, CalendarDays, DollarSign, Calculator } from "lucide-react";
import DashboardShuttleSchedule from "@/components/dashboard/DashboardShuttleSchedule";
import InstructorSalaryChart from "@/components/dashboard/InstructorSalaryChart";

export default async function InstructorDashboard() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) return <div>Access Denied</div>;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { instructorProfile: true }
    });

    if (!user || user.role !== 'INSTRUCTOR') return <div>Access Denied</div>;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const startOfNextMonth = new Date(currentYear, currentMonth, 1);

    const enrollments = await prisma.enrollment.findMany({
        where: { instructorId: user.id }
    });

    const attendances = await prisma.attendance.findMany({
        where: {
            enrollment: { instructorId: user.id },
            date: { gte: startOfMonth, lt: startOfNextMonth },
            status: 'PRESENT'
        },
        include: { enrollment: { include: { student: true } } },
        orderBy: { date: 'desc' }
    });

    // 급여 시뮬레이션 계산 로직
    const profile = user.instructorProfile;
    let totalTuitionVND = 0;

    attendances.forEach(att => {
        totalTuitionVND += att.enrollment.feePerSession;
    });

    const baseRate = profile?.baseRate || 0.65;
    const instructorShareVND = totalTuitionVND * baseRate;
    const insuranceFee = profile?.insuranceFee || 0;

    // 3.5% tax
    const taxableVND = Math.max(0, instructorShareVND - insuranceFee);
    const tax35Deduction = taxableVND * 0.035;
    const remainingVND = taxableVND - tax35Deduction;

    // 환율 임의 고정값 (추후 Owner가 설정할 수 있도록 확장 가능)
    const exchangeRate = 18.5; // 100,000 VND -> approx 5,400 KRW
    const transferFee = 5000;

    const finalKRW = remainingVND / exchangeRate;
    const krwAfterTransferFee = Math.max(0, finalKRW - transferFee);
    const krwTax33 = krwAfterTransferFee * 0.033;
    const finalNetKRW = Math.max(0, krwAfterTransferFee - krwTax33);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        강사 대시보드
                    </h1>
                    <p className="text-slate-500 mt-1">이번 달({currentMonth}월) 실시간 출결 및 예상 급여 현황입니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
                    <div className="p-5 flex items-center">
                        <div className="flex-shrink-0">
                            <UserCheck className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-500 truncate">담당 학생수</dt>
                                <dd className="text-lg font-medium text-slate-900">{enrollments.length} 명</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
                    <div className="p-5 flex items-center">
                        <div className="flex-shrink-0">
                            <CalendarDays className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-500 truncate">이번 달 누적 수업 출석</dt>
                                <dd className="text-lg font-medium text-slate-900">{attendances.length} 회차</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 overflow-hidden shadow rounded-lg border border-blue-200">
                    <div className="p-5 flex items-center">
                        <div className="flex-shrink-0">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-blue-800 truncate">예상 실수령액 (KRW)</dt>
                                <dd className="text-xl font-bold text-blue-900">₩ {Math.floor(finalNetKRW).toLocaleString()}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            <InstructorSalaryChart 
                totalTuitionVND={totalTuitionVND}
                instructorShareVND={instructorShareVND}
                insuranceFee={insuranceFee}
                tax35Deduction={tax35Deduction}
                remainingVND={remainingVND}
                finalKRW={finalKRW}
                transferFee={transferFee}
                krwTax33={krwTax33}
                finalNetKRW={finalNetKRW}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 실시간 명세서 카드 */}
                <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex items-center space-x-2">
                        <Calculator className="h-5 w-5 text-slate-500" />
                        <h3 className="text-lg leading-6 font-medium text-slate-900">당월 예상 급여명세서</h3>
                    </div>
                    <div className="px-5 py-5 text-sm">
                        <div className="space-y-3">
                            <div className="flex justify-between text-slate-600">
                                <span>발생 총 수업료 (VND)</span>
                                <span className="font-medium text-slate-900">{totalTuitionVND.toLocaleString()} ₫</span>
                            </div>
                            <div className="flex justify-between text-slate-600 pb-2 border-b border-slate-100">
                                <span>계약 비율 ({baseRate * 100}%) 반영</span>
                                <span className="font-medium text-blue-600">{instructorShareVND.toLocaleString()} ₫</span>
                            </div>

                            <div className="flex justify-between text-slate-500">
                                <span>보험료 공제</span>
                                <span>- {insuranceFee.toLocaleString()} ₫</span>
                            </div>
                            <div className="flex justify-between text-slate-500 pb-2 border-b border-slate-100">
                                <span>베트남 소득세 (3.5%) 공제</span>
                                <span>- {Math.floor(tax35Deduction).toLocaleString()} ₫</span>
                            </div>

                            <div className="flex justify-between font-medium text-slate-800 pb-2 border-b border-slate-100">
                                <span>환전 대상 금액 (VND)</span>
                                <span>{Math.floor(remainingVND).toLocaleString()} ₫</span>
                            </div>

                            <div className="flex justify-between text-slate-500 mt-4">
                                <span>적용 환율 (예상치)</span>
                                <span>1 KRW = {exchangeRate} VND</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>환전 금액 (KRW)</span>
                                <span>₩ {Math.floor(finalKRW).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>해외 송금 수수료</span>
                                <span>- ₩ {transferFee.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 pb-2 border-b border-slate-100">
                                <span>한국 원천징수 (3.3%)</span>
                                <span>- ₩ {Math.floor(krwTax33).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold text-slate-900 mt-4 pt-2">
                                <span>최종 예상 실수령액</span>
                                <span className="text-blue-600">₩ {Math.floor(finalNetKRW).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 최근 출결 현황 */}
                <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
                        <h3 className="text-lg leading-6 font-medium text-slate-900">최근 출결 내역</h3>
                    </div>
                    {attendances.length === 0 ? (
                        <div className="p-4 bg-slate-50 text-center text-sm text-slate-500 py-12 h-64 flex flex-col items-center justify-center">
                            <p>이번 달 출결 내역이 없습니다.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
                            {attendances.map((att) => (
                                <li key={att.id} className="p-4 hover:bg-slate-50">
                                    <div className="flex justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{att.enrollment.student.name} 학생</p>
                                            <p className="text-xs text-slate-500">{att.enrollment.subjectName} · {att.method === 'QR_SCAN' ? 'QR 스캔' : '수기 입력'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-slate-600 font-medium">{att.date.toLocaleDateString()}</p>
                                            <p className="text-xs text-green-600">출석 완료</p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Shuttle Schedule Section */}
            <div className="h-[600px]">
                <DashboardShuttleSchedule />
            </div>
        </div>
    );
}
