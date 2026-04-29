"use client";

import { useState, useEffect } from "react";
import { Database, Download, Trash2, UploadCloud, RefreshCw, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

type BackupFile = {
    filename: string;
    createdAt: string;
    size: number;
};

export default function BackupRestoreSection() {
    const router = useRouter();
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchBackups = async () => {
        try {
            const res = await fetch('/api/admin/backup');
            if (res.ok) {
                const data = await res.json();
                setBackups(data.backups || []);
            }
        } catch (error) {
            console.error("Failed to fetch backups", error);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleCreateBackup = async () => {
        if (!confirm("현재 데이터베이스의 전체 백업을 생성하시겠습니까?")) return;
        
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/backup', { method: 'POST' });
            if (!res.ok) throw new Error("백업 생성 실패");
            
            setMessage({ type: 'success', text: "백업 파일이 생성되었습니다. (Vercel 특성상 생성된 백업은 가급적 PC로 다운로드 바랍니다.)" });
            fetchBackups();
        } catch (error) {
            setMessage({ type: 'error', text: "백업 생성 중 오류가 발생했습니다." });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBackup = async (filename: string) => {
        if (!confirm(`'${filename}' 백업 파일을 서버에서 삭제하시겠습니까?`)) return;
        
        setActionLoading(true);
        try {
            const res = await fetch(`/api/admin/backup/${filename}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("삭제 실패");
            
            fetchBackups();
        } catch (error) {
            alert("백업 파일 삭제 중 오류가 발생했습니다.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRestoreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm(`정말 '${file.name}' 파일로 데이터베이스를 복구하시겠습니까?\n\n⚠️ 경고: 현재 데이터베이스의 모든 데이터가 삭제되고 백업 파일의 데이터로 덮어씌워집니다. 이 작업은 되돌릴 수 없습니다!`)) {
            e.target.value = '';
            return;
        }

        setActionLoading(true);
        setMessage(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/backup/restore', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "복구 실패");
            }

            setMessage({ type: 'success', text: "데이터베이스가 성공적으로 복구되었습니다. 변경사항 반영을 위해 잠시 후 새로고침됩니다." });
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || "복구 중 오류가 발생했습니다." });
        } finally {
            setActionLoading(false);
            e.target.value = '';
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden mt-6">
            <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg leading-6 font-medium text-slate-900">전체 백업 및 복구 관리</h3>
                </div>
                <button
                    onClick={handleCreateBackup}
                    disabled={loading || actionLoading}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    현재 DB 전체 백업 생성
                </button>
            </div>
            
            <div className="px-4 py-5 sm:p-6 space-y-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                <strong>주의사항:</strong> 서버(Vercel) 환경의 특성상 생성된 백업 파일은 서버 재시작 시 삭제될 수 있습니다. 
                                백업 생성 후 반드시 <strong>[다운로드]</strong> 버튼을 눌러 로컬 PC에 보관해 주세요. 
                                복구 시에는 보관해둔 백업 파일을 <strong>[백업 파일 업로드로 복구]</strong> 버튼을 통해 복구하시면 됩니다.
                            </p>
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <div className="flex items-center justify-between mt-4">
                    <h4 className="text-sm font-medium text-slate-900">서버 임시 보관 백업 목록 ({backups.length}건)</h4>
                    
                    <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                        <UploadCloud className="w-4 h-4 mr-2 text-indigo-500" />
                        {actionLoading ? '복구 진행 중...' : '백업 파일 업로드로 복구 (PC에서 선택)'}
                        <input type="file" className="hidden" accept=".json" onChange={handleRestoreUpload} disabled={actionLoading} />
                    </label>
                </div>

                <div className="mt-2 border border-slate-200 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">파일명</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">생성 일시</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">용량</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {backups.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                                        생성된 백업 파일이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                backups.map((backup) => (
                                    <tr key={backup.filename} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {backup.filename}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(backup.createdAt).toLocaleString('ko-KR')}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                                            {formatBytes(backup.size)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <a 
                                                href={`/api/admin/backup/${backup.filename}`}
                                                download
                                                className="inline-flex items-center px-2.5 py-1.5 border border-slate-300 shadow-sm text-xs font-medium rounded text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                <Download className="w-3.5 h-3.5 mr-1" />
                                                다운로드
                                            </a>
                                            <button
                                                onClick={() => handleDeleteBackup(backup.filename)}
                                                disabled={actionLoading}
                                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                삭제
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
