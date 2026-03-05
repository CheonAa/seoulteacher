"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function DeleteNoticeButton({ noticeId }: { noticeId: string }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('정말로 이 공지사항을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) {
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/notices/${noticeId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '삭제에 실패했습니다.');
            }

            alert('공지사항이 삭제되었습니다.');
            router.push('/admin/notices');
            router.refresh();
        } catch (error: any) {
            alert(error.message);
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center px-3 py-1.5 border border-red-200 shadow-sm text-sm font-medium rounded text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
        >
            <Trash2 className="w-4 h-4 mr-1.5" />
            {isDeleting ? '삭제 중...' : '삭제'}
        </button>
    );
}
