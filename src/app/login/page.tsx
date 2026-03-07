"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // System Settings State
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [siteName, setSiteName] = useState<string>("SeoulTeacher");
    const [companyName, setCompanyName] = useState<string>("(주)서울티쳐");
    const [companyRegNo, setCompanyRegNo] = useState<string>("");
    const [companyAddress, setCompanyAddress] = useState<string>("");
    const [companyPhone, setCompanyPhone] = useState<string>("");
    const [snsName, setSnsName] = useState<string>("");
    const [consultLink, setConsultLink] = useState<string>("");

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    if (data.SYSTEM_LOGO) setLogoUrl(data.SYSTEM_LOGO);
                    if (data.SITE_NAME) setSiteName(data.SITE_NAME);
                    if (data.COMPANY_NAME) setCompanyName(data.COMPANY_NAME);
                    if (data.COMPANY_REG_NO) setCompanyRegNo(data.COMPANY_REG_NO);
                    if (data.COMPANY_ADDRESS) setCompanyAddress(data.COMPANY_ADDRESS);
                    if (data.COMPANY_PHONE) setCompanyPhone(data.COMPANY_PHONE);
                    if (data.SNS_NAME) setSnsName(data.SNS_NAME);
                    if (data.CONSULT_LINK) setConsultLink(data.CONSULT_LINK);
                }
            } catch (err) {
                console.error("Failed to load layout settings", err);
            }
        };
        loadSettings();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError("이메일 또는 비밀번호가 일치하지 않습니다.");
            setLoading(false);
        } else {
            router.push("/"); // Middleware will redirect to correct dashboard
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    {logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={logoUrl} alt={siteName} className="h-16 w-auto object-contain" />
                    ) : (
                        <h2 className="text-center text-3xl font-extrabold text-slate-900">
                            <span className="text-blue-600 truncate">{siteName || "SeoulTeacher"}</span>
                        </h2>
                    )}
                </div>
                <p className="mt-2 text-center text-sm text-slate-600">
                    학원 관리 및 급여 정산 시스템
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700">이메일 계정</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 px-3 border text-slate-900 bg-white"
                                    placeholder="admin@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">비밀번호</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 px-3 border text-slate-900 bg-white"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                            >
                                {loading ? "로그인 중..." : "시스템 로그인"}
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <div className="text-xs text-slate-500 text-center space-y-1">
                                {companyName && <p className="font-semibold text-slate-600">{companyName}</p>}
                                {companyRegNo && <p>사업자등록번호: {companyRegNo}</p>}
                                {companyAddress && <p>주소: {companyAddress}</p>}
                                {(companyPhone || snsName) && (
                                    <p>
                                        {companyPhone && <span>Tel: {companyPhone}</span>}
                                        {companyPhone && snsName && <span className="mx-2">|</span>}
                                        {snsName && <span>인스타그램: <a href={snsName} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-slate-800">바로가기</a></span>}
                                    </p>
                                )}
                                {consultLink && (
                                    <p className="mt-2">
                                        <a href={consultLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                                            고객 센터 / 상담 채널
                                        </a>
                                    </p>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
