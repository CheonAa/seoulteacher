import { Metadata } from 'next';
import InstructorForm from '../../new/InstructorForm';
import { UserCog, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: '강사 정보 수정 | 관리자 대시보드',
};

export default async function EditInstructorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const instructor = await prisma.user.findUnique({
        where: { id: id, role: 'INSTRUCTOR' },
        include: {
            instructorProfile: true,
        }
    });

    if (!instructor) {
        notFound();
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <Link
                    href="/admin/instructors"
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <UserCog className="w-6 h-6 text-emerald-600" />
                        강사 정보 수정
                    </h1>
                    <p className="text-slate-500 mt-1">강사 계정 설정 및 급여/정산 기준을 수정합니다.</p>
                </div>
            </div>

            <div className="bg-white p-2 shadow rounded-lg border border-slate-200">
                <InstructorForm isEdit={true} initialData={instructor} />
            </div>
        </div>
    );
}
