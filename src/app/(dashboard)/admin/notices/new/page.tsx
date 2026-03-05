import { Metadata } from 'next';
import NoticeForm from '@/components/notices/NoticeForm';
import { Megaphone, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '새 공지사항 작성 | 관리자 대시보드',
};

export default function NewNoticePage() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <Link
                    href="/admin/notices"
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-blue-600" />
                        새 공지사항 작성
                    </h1>
                    <p className="text-slate-500 mt-1">새로운 공지사항을 작성하여 파트너들에게 안내합니다.</p>
                </div>
            </div>

            <div className="bg-white p-6 shadow rounded-lg border border-slate-200">
                <NoticeForm />
            </div>
        </div>
    );
}
