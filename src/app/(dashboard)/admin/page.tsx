import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { ClipboardList, AlertCircle, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";
import { markAsPaid } from "./actions";
import DashboardShuttleSchedule from "@/components/dashboard/DashboardShuttleSchedule";

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 오늘 출석한 학생 리스트
    const todayAttendances = await prisma.attendance.findMany({
        where: {
            date: {
                gte: today,
                lt: tomorrow
            }
        },
        include: {
            enrollment: {
                include: {
                    student: true,
                    instructor: true
                }
            }
        },
        orderBy: {
            date: 'desc'
        }
    });

    const todayClassesCount = todayAttendances.length;

    // 미납 학생 수 (이번 달 및 이전 달 청구서 기준)
    const unpaidBillings = await prisma.monthlyBilling.findMany({
        where: {
            isPaid: false
        },
        include: {
            enrollment: {
                include: {
                    student: true
                }
            }
        }
    });

    const unpaidStudentsCount = unpaidBillings.length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    관리자(Admin) 대시보드
                </h1>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* 오늘 수업 */}
                <div className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
                    <div className="p-5 flex items-center">
                        <div className="flex-shrink-0">
                            <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-500 truncate">오늘 출석 수강생</dt>
                                <dd className="text-lg font-medium text-slate-900">{todayClassesCount} 명</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* 미납 내역 경고 */}
                <div className="bg-red-50 overflow-hidden shadow rounded-lg border border-red-200">
                    <div className="p-5 flex items-center">
                        <div className="flex-shrink-0">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-red-800 truncate">미납 청구 건수</dt>
                                <dd className="text-lg font-bold text-red-900">{unpaidStudentsCount} 건</dd>
                            </dl>
                        </div>
                    </div>
                    <div className="bg-red-100 px-5 border-t border-red-200 py-3 text-sm">
                        <Link href="/admin/billing" className="font-medium text-red-800 hover:text-red-900">납부 여부 확인하기</Link>
                    </div>
                </div>
            </div>

            {/* Today's check-in */}
            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">오늘의 출결 현황 (Today's check-in)</h3>
                    <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-md border border-blue-200">
                        {today.toLocaleDateString()}
                    </span>
                </div>

                {todayAttendances.length === 0 ? (
                    <div className="p-4 bg-slate-50 text-center text-sm text-slate-500 py-8">
                        <ClipboardList className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                        <span>아직 출석한 학생이 없습니다.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 gap-4">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">시간</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">학생 이름</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">수강 과목</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">담당 강사</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">스캔 방식</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {todayAttendances.map((att) => (
                                    <tr key={att.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap space-x-2 text-sm text-slate-500">
                                            {att.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap space-x-2 text-sm font-medium text-slate-900">
                                            {att.enrollment.student.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap space-x-2 text-sm text-slate-500">
                                            {att.enrollment.subjectName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap space-x-2 text-sm text-slate-500">
                                            {att.enrollment.instructor.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap space-x-2 text-sm text-slate-500">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${att.method === 'QR_SCAN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {att.method}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Shuttle Schedule Section */}
            <div className="h-[600px]">
                <DashboardShuttleSchedule />
            </div>
        </div>
    );
}
