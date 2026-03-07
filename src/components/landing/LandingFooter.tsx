import Link from "next/link";
import { Instagram, MapPin, Mail, Phone } from "lucide-react";

interface LandingFooterProps {
    settings?: Record<string, string>;
}

export default function LandingFooter({ settings }: LandingFooterProps) {
    // Default values if settings not found
    const companyName = settings?.["COMPANY_NAME"] || "HANOI SEOUL ACADEMY";
    const repName = settings?.["REPRESENTATIVE_NAME"] || "김대표";
    const regNo = settings?.["COMPANY_REG_NO"] || "123-45-67890";
    const address = settings?.["COMPANY_ADDRESS"] || "A14 Fivestar Mỹ Đình, Ngõ 154 Đình Thôn, Phường Cầu 기ấy, TP. Hà Nội, Việt Nam";
    const phone = settings?.["COMPANY_PHONE"] || "012-345-6789";
    const snsLink = settings?.["SNS_NAME"] || "https://www.instagram.com/edu.seoul";
    const siteName = settings?.["SITE_NAME"] || "HANOI SEOUL ACADEMY";
    const dashboardLogo = settings?.["DASHBOARD_LOGO"] || null;

    return (
        <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

                    {/* Brand Info */}
                    <div className="lg:col-span-2">
                        <div className="mb-6">
                            {dashboardLogo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={dashboardLogo} alt={siteName} className="h-10 w-auto object-contain" />
                            ) : (
                                <h5 className="text-white text-xl font-bold tracking-tight">{siteName}</h5>
                            )}
                        </div>

                        <div className="space-y-2 text-sm text-slate-400">
                            <p className="text-white font-medium mb-1">{companyName}</p>
                            <p>대표자: {repName}</p>
                            <p>사업자등록번호: {regNo}</p>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h6 className="text-white font-bold mb-6">바로가기</h6>
                        <ul className="space-y-4 text-sm font-medium">
                            <li><a href="#about" className="hover:text-blue-400 transition-colors">학원소개</a></li>
                            <li><a href="#curriculum" className="hover:text-blue-400 transition-colors">커리큘럼</a></li>
                            <li><a href={snsLink} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">인스타그램</a></li>
                            <li><a href="#location" className="hover:text-blue-400 transition-colors">오시는 길</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h6 className="text-white font-bold mb-6">고객센터</h6>
                        <ul className="space-y-4 text-sm text-slate-400 mb-6">
                            <li className="flex items-center gap-2">
                                <Phone className="w-4 h-4" /> {phone}
                            </li>
                            <li className="flex items-start gap-2">
                                <Mail className="w-4 h-4 mt-0.5" />
                                <span>hanoiseoulacademy@gmail.com</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5" />
                                <span>{address}</span>
                            </li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 text-xs font-medium">
                        <Link href="/terms" className="hover:text-white transition-colors">이용약관</Link>
                        <span className="text-slate-600">|</span>
                        <Link href="/privacy" className="text-white font-bold hover:text-blue-400 transition-colors">개인정보처리방침</Link>
                        <span className="text-slate-600">|</span>
                        <Link href="/refund" className="hover:text-white transition-colors">환불규정</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <a href={snsLink} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 hover:text-white transition-all">
                            <Instagram className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-slate-500">
                    <p>© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
                </div>

            </div>
        </footer>
    );
}
