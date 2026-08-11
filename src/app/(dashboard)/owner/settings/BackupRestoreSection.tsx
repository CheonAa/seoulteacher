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

    const handleCreateBackup = async (type: 'db' | 'uploads' | 'source' | 'all') => {
        let typeName = "";
        if (type === 'db') typeName = "데이터베이스";
        else if (type === 'uploads') typeName = "앱 자료 (업로드 파일)";
        else if (type === 'source') typeName = "소스 코드";
        else if (type === 'all') typeName = "전체 패키지 (DB + 자료 + 소스코드)";

        if (!confirm(`${typeName} 백업을 생성하시겠습니까?`)) return;
        
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/backup?type=${type}`, { method: 'POST' });
            let data = null;
            let errorMessage = "";
            try {
                data = await res.json();
            } catch (jsonErr) {
                const text = await res.text().catch(() => "");
                errorMessage = text ? text.substring(0, 150) : `HTTP status ${res.status}`;
            }

            if (!res.ok) throw new Error(data?.error || errorMessage || "백업 생성 실패");
            
            setMessage({ type: 'success', text: `${typeName} 백업 파일(${data.filename})이 생성되었습니다.` });
            fetchBackups();
        } catch (error: any) {
            setMessage({ type: 'error', text: `${typeName} 백업 생성 중 오류가 발생했습니다. (${error.message})` });
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

        if (!confirm(`정말 '${file.name}' 파일로 복구를 진행하시겠습니까?\n\n⚠️ 경고: 현재 데이터베이스가 초기화되고 백업 파일 내의 데이터, 앱 자료(업로드 파일), 소스 코드 등이 덮어씌워집니다. 이 작업은 되돌릴 수 없습니다!`)) {
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

            const resData = await res.json();
            setMessage({ type: 'success', text: resData.message || "복구가 성공적으로 완료되었습니다." });
            setTimeout(() => {
                window.location.reload();
            }, 3000);
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

    const getBackupTypeLabel = (filename: string) => {
        if (filename.includes('_db_backup_')) return '데이터베이스 (JSON)';
        if (filename.includes('_uploads_backup_')) return '앱 자료 (ZIP)';
        if (filename.includes('_source_backup_')) return '소스 코드 (ZIP)';
        if (filename.includes('_full_backup_')) return '전체 패키지 (ZIP)';
        return '기본 데이터 백업';
    };

    return (
        <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden mt-6">
            <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex items-center bg-slate-50">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg leading-6 font-medium text-slate-900">전체 백업 및 복구 관리</h3>
                </div>
            </div>
            
            <div className="px-4 py-5 sm:p-6 space-y-5">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3 text-sm text-yellow-700">
                            <p className="font-semibold">⚠️ 백업 파일 다운로드 및 유실 방지 안내:</p>
                            <p className="mt-1">
                                서버(Vercel) 환경 특성상 생성된 백업은 서버 재기동 시 자동 삭제될 수 있습니다. 
                                백업 생성 완료 후 반드시 <strong>[다운로드]</strong>를 클릭하여 로컬 PC에 안전하게 보관해 주십시오. 
                                복구 시에는 보관된 파일(.json 또는 .zip)을 <strong>[백업 파일 업로드로 복구]</strong> 버튼으로 업로드해 복원하면 됩니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 백업 생성 버튼 그리드 */}
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-700">백업 유형별 생성 실행</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            onClick={() => handleCreateBackup('db')}
                            disabled={loading || actionLoading}
                            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent shadow-sm text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                            데이터베이스 백업
                        </button>
                        <button
                            onClick={() => handleCreateBackup('uploads')}
                            disabled={loading || actionLoading}
                            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent shadow-sm text-xs font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                            앱 자료(업로드 파일) 백업
                        </button>
                        <button
                            onClick={() => handleCreateBackup('source')}
                            disabled={loading || actionLoading}
                            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent shadow-sm text-xs font-bold rounded-lg text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                            소스 코드 백업
                        </button>
                        <button
                            onClick={() => handleCreateBackup('all')}
                            disabled={loading || actionLoading}
                            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent shadow-sm text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                            전체 패키지 통합 백업
                        </button>
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800">서버 임시 보관 백업 목록 ({backups.length}건)</h4>
                    
                    <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-slate-350 shadow-sm text-xs font-bold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                        <UploadCloud className="w-4 h-4 mr-2 text-indigo-600" />
                        {actionLoading ? '복구 진행 중...' : '백업 파일 업로드로 복구 (PC에서 선택)'}
                        <input type="file" className="hidden" accept=".json,.zip" onChange={handleRestoreUpload} disabled={actionLoading} />
                    </label>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">파일명</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">유형</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">생성 일시</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">용량</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {backups.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-xs">
                                        생성 또는 임시 보관된 백업 파일이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                backups.map((backup) => (
                                    <tr key={backup.filename} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-900 truncate max-w-xs" title={backup.filename}>
                                            {backup.filename}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs font-medium">
                                            {getBackupTypeLabel(backup.filename)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {new Date(backup.createdAt).toLocaleString('ko-KR')}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {formatBytes(backup.size)}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                                            <a 
                                                href={`/api/admin/backup/${backup.filename}`}
                                                download
                                                className="inline-flex items-center px-2.5 py-1.5 border border-slate-350 shadow-sm text-xs font-bold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                            >
                                                <Download className="w-3.5 h-3.5 mr-1" />
                                                다운로드
                                            </a>
                                            <button
                                                onClick={() => handleDeleteBackup(backup.filename)}
                                                disabled={actionLoading}
                                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-bold rounded-lg text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors"
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
