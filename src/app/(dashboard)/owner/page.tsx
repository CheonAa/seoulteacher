import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Users, FileUser, CreditCard, LogOut } from "lucide-react";
import Link from "next/link";
import DashboardShuttleSchedule from "@/components/dashboard/DashboardShuttleSchedule";

export default async function OwnerDashboard() {
    const session = await getServerSession(authOptions);

    // Extract summary stats from DB
    const studentsCount = await prisma.student.count();
    const activeInstructors = await prisma.user.count({ where: { role: "INSTRUCTOR" } });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    대표자(Owner) 대시보드
                </h1>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* KPI Cards */}
                <div className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-slate-500 truncate">총 등록 학생</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-slate-900">{studentsCount} 명</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-5 border-t border-slate-200 py-3">
                        <div className="text-sm">
                            <Link href="/admin/students" className="font-medium text-blue-700 hover:text-blue-900">학생 목록 보기</Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <FileUser className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-slate-500 truncate">활동 강사</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-slate-900">{activeInstructors} 명</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-5 border-t border-slate-200 py-3">
                        <div className="text-sm">
                            <Link href="/admin/instructors" className="font-medium text-blue-700 hover:text-blue-900">강사 관리</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Summary Section */}
            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">시스템 환영 메시지</h3>
                </div>
                <div className="px-4 py-5 sm:p-6 text-slate-600">
                    <p>안녕하세요, <strong>{session?.user?.name}</strong>님!</p>
                    <p className="mt-2">좌측 메뉴를 통해 전체 학원 시스템 및 통계 지표, 강사 급여 정산 테이블(엑셀 호환 구조)을 관리하실 수 있습니다.</p>
                </div>
            </div>

            {/* Shuttle Schedule Section */}
            <div className="h-[600px]">
                <DashboardShuttleSchedule />
            </div>
        </div>
    );
}
