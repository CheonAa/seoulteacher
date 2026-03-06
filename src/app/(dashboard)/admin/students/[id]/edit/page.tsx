import { Metadata } from 'next';
import StudentForm from '../../new/StudentForm';
import { UserCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: '학생 정보 수정 | 관리자 대시보드',
};

export default async function EditStudentPage({ params }: { params: { id: string } }) {
    // 1. Load instructor data for the dropdown
    const instructors = await prisma.user.findMany({
        where: { role: 'INSTRUCTOR' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
    });

    // 2. Load student data for pre-filling
    const student = await prisma.student.findUnique({
        where: { id: params.id },
        include: {
            parents: true,
            enrollments: true,
        }
    });

    if (!student) {
        notFound();
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <Link
                    href="/admin/students"
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-blue-600" />
                        학생 정보 수정
                    </h1>
                    <p className="text-slate-500 mt-1">기존에 등록된 학생, 학부모 및 차량 탑승 정보를 수정합니다.</p>
                </div>
            </div>

            <div className="bg-white p-2 shadow rounded-lg border border-slate-200">
                <StudentForm instructors={instructors} isEdit={true} initialData={student} />
            </div>
        </div>
    );
}
