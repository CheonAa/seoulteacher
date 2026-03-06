import { Metadata } from 'next';
import AttendanceForm from '../../new/AttendanceForm';
import { UserCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: '출결 기록 수정 | 관리자 대시보드',
};

export default async function EditAttendancePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const attendance = await prisma.attendance.findUnique({
        where: { id: id },
        include: {
            enrollment: {
                include: {
                    student: { select: { name: true } },
                    instructor: { select: { name: true } }
                }
            }
        }
    });

    if (!attendance) {
        notFound();
    }

    // AttendanceForm needs an array of enrollments to populate the select dropdown
    const enrollments = await prisma.enrollment.findMany({
        include: {
            student: { select: { name: true } },
            instructor: { select: { name: true } }
        },
        orderBy: {
            student: { name: 'asc' }
        }
    });

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <Link
                    href="/admin/attendance"
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-blue-600" />
                        출결 기록 수정
                    </h1>
                    <p className="text-slate-500 mt-1">학생의 수동 결석/출석 기록을 수정합니다.</p>
                </div>
            </div>

            <div className="bg-white p-2 shadow rounded-lg border border-slate-200">
                <AttendanceForm enrollments={enrollments} isEdit={true} initialData={attendance} />
            </div>
        </div>
    );
}
