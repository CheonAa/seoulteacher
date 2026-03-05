"use client";

import { useState, useEffect } from "react";
import { Save, Image as ImageIcon, Building2, Link as LinkIcon, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OwnerSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // State for all settings
    const [settings, setSettings] = useState({
        SYSTEM_LOGO: "", // Base64 image
        DASHBOARD_LOGO: "", // Base64 image
        COMPANY_NAME: "",
        COMPANY_REG_NO: "",
        COMPANY_ADDRESS: "",
        COMPANY_PHONE: "",
        SITE_NAME: "SeoulTeacher", // Default site name
        SNS_NAME: "",
        CONSULT_LINK: "",
    });

    // Load initial settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();

                    // Merge fetched data with default state
                    setSettings(prev => ({
                        ...prev,
                        ...data
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch settings", error);
            } finally {
                setInitialLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (limit to ~500KB to prevent giant base64 strings in SQLite)
        if (file.size > 500 * 1024) {
            setMessage({ type: 'error', text: '이미지 크기는 500KB 이하여야 합니다. 더 작은 이미지를 선택해주세요.' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setSettings(prev => ({ ...prev, SYSTEM_LOGO: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const removeLogo = () => {
        setSettings(prev => ({ ...prev, SYSTEM_LOGO: "" }));
    };

    const handleDashboardLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 500 * 1024) {
            setMessage({ type: 'error', text: '이미지 크기는 500KB 이하여야 합니다. 더 작은 이미지를 선택해주세요.' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setSettings(prev => ({ ...prev, DASHBOARD_LOGO: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const removeDashboardLogo = () => {
        setSettings(prev => ({ ...prev, DASHBOARD_LOGO: "" }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            if (!res.ok) throw new Error("설정 저장 실패");

            setMessage({ type: 'success', text: '설정이 성공적으로 저장되었습니다. (새로고침시 상단 로고 반영)' });

            // Optional: force a refresh to update the layout if needed
            setTimeout(() => {
                router.refresh();
            }, 1000);

        } catch (error) {
            setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return <div className="p-8 text-center text-slate-500">설정 정보를 불러오는 중입니다...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    시스템 및 학원 설정
                </h1>
            </div>

            {message && (
                <div className={`p-4 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Login Logo Section */}
                <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg leading-6 font-medium text-slate-900">로그인 화면 로고 설정</h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            <div className="flex-shrink-0">
                                {settings.SYSTEM_LOGO ? (
                                    <div className="relative w-48 h-16 border border-slate-200 rounded bg-slate-50 flex items-center justify-center p-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={settings.SYSTEM_LOGO} alt="Login Logo" className="max-h-full max-w-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-48 h-16 border-2 border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
                                        로고 이미지 없음
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="text-sm text-slate-500">로그인 화면에 표시될 이미지를 업로드하세요. (가로형 로고 권장, 최대 500KB)</p>
                                <div className="flex gap-2">
                                    <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                                        파일 선택
                                        <input type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} />
                                    </label>
                                    {settings.SYSTEM_LOGO && (
                                        <button type="button" onClick={removeLogo} className="inline-flex items-center px-3 py-2 border border-red-200 shadow-sm text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50">
                                            초기화 (텍스트만 렌더링)
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Logo Section */}
                <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg leading-6 font-medium text-slate-900">대시보드 사이드바 로고 설정</h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            <div className="flex-shrink-0">
                                {settings.DASHBOARD_LOGO ? (
                                    <div className="relative w-48 h-16 border border-slate-200 rounded bg-slate-900 flex items-center justify-center p-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={settings.DASHBOARD_LOGO} alt="Dashboard Logo" className="max-h-full max-w-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-48 h-16 border-2 border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
                                        로고 이미지 없음
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="text-sm text-slate-500">대시보드 좌측 상단(어두운 배경)에 표시될 이미지를 업로드하세요. (밝은 톤의 가로형 로고 권장, 최대 500KB)</p>
                                <div className="flex gap-2">
                                    <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                                        파일 선택
                                        <input type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleDashboardLogoUpload} />
                                    </label>
                                    {settings.DASHBOARD_LOGO && (
                                        <button type="button" onClick={removeDashboardLogo} className="inline-flex items-center px-3 py-2 border border-red-200 shadow-sm text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50">
                                            초기화 (텍스트만 렌더링)
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Company Info Section */}
                <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg leading-6 font-medium text-slate-900">기본 학원 정보</h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">사이트명(브랜드명)</label>
                            <input type="text" name="SITE_NAME" value={settings.SITE_NAME} onChange={handleChange} className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="SeoulTeacher" />
                            <p className="text-xs text-slate-500 mt-1">로고가 없을 때 텍스트로 표시될 이름입니다.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">회사/법인명</label>
                            <input type="text" name="COMPANY_NAME" value={settings.COMPANY_NAME} onChange={handleChange} className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="(주)서울티쳐" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">사업자 등록번호</label>
                            <input type="text" name="COMPANY_REG_NO" value={settings.COMPANY_REG_NO} onChange={handleChange} className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="123-45-67890" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">사업장 주소</label>
                            <input type="text" name="COMPANY_ADDRESS" value={settings.COMPANY_ADDRESS} onChange={handleChange} className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="하노이 미딩..." />
                        </div>
                    </div>
                </div>

                {/* Contact & Links Section */}
                <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg leading-6 font-medium text-slate-900">연락처 및 외부 채널</h3>
                    </div>
                    <div className="px-4 py-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 flex items-center gap-1"><Phone className="w-4 h-4 text-slate-400" /> 대표 연락처</label>
                            <input type="text" name="COMPANY_PHONE" value={settings.COMPANY_PHONE} onChange={handleChange} className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="010-1234-5678" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">공식 SNS명</label>
                            <input type="text" name="SNS_NAME" value={settings.SNS_NAME} onChange={handleChange} className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="@seoulteacher_official" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">카카오톡 등 상담채널 링크</label>
                            <input type="url" name="CONSULT_LINK" value={settings.CONSULT_LINK} onChange={handleChange} className="mt-1 block w-full bg-white text-slate-900 border border-slate-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="https://pf.kakao.com/..." />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 pb-12">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        {loading ? '저장 중...' : '모든 설정 저장하기'}
                    </button>
                </div>

            </form>
        </div>
    );
}
