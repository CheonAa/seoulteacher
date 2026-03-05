import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import NoticeForm from '@/components/notices/NoticeForm';
import { Megaphone, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const metadata: Metadata = {
    title: '공지사항 수정 | 관리자 대시보드',
};

export default async function EditNoticePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    // Only OWNER and ADMIN can edit
    if (role !== "OWNER" && role !== "ADMIN") {
        return notFound();
    }

    const notice = await prisma.notice.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            content: true,
            isImportant: true
        }
    });

    if (!notice) {
        return notFound();
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <Link
                    href={`/admin/notices/${notice.id}`}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-blue-600" />
                        공지사항 수정
                    </h1>
                </div>
            </div>

            <div className="bg-white p-6 shadow rounded-lg border border-slate-200">
                <NoticeForm initialData={notice} isEdit={true} />
            </div>
        </div>
    );
}
