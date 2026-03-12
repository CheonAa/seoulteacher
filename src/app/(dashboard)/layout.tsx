"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    CalendarCheck,
    CreditCard,
    LogOut,
    Menu,
    X,
    Settings,
    Bus,
    Megaphone,
    ScanLine
} from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // System Settings State
    const [dashboardLogoUrl, setDashboardLogoUrl] = useState<string | null>(null);
    const [siteName, setSiteName] = useState<string>("SeoulTeacher");

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    if (data.DASHBOARD_LOGO) setDashboardLogoUrl(data.DASHBOARD_LOGO);
                    if (data.SITE_NAME) setSiteName(data.SITE_NAME);
                }
            } catch (err) {
                console.error("Failed to load layout settings", err);
            }
        };
        loadSettings();
    }, []);

    if (status === "loading") {
        return <div className="h-screen w-full flex items-center justify-center text-blue-900">로딩 중...</div>;
    }

    const role = session?.user?.role || "GUEST";

    const navigation = [
        { name: "대시보드", href: `/${role.toLowerCase()}`, icon: LayoutDashboard, roles: ["OWNER", "ADMIN", "INSTRUCTOR"] },
        { name: "사용자 관리", href: "/owner/users", icon: Users, roles: ["OWNER"] },
        { name: "공지사항", href: "/admin/notices", icon: Megaphone, roles: ["OWNER", "ADMIN", "INSTRUCTOR"] },
        { name: "학생 관리", href: "/admin/students", icon: Users, roles: ["OWNER", "ADMIN", "INSTRUCTOR"] },
        { name: "출결 대시보드", href: "/admin/attendance", icon: CalendarCheck, roles: ["OWNER", "ADMIN", "INSTRUCTOR"] },
        { name: "수강료 관리", href: "/admin/billing", icon: CreditCard, roles: ["OWNER", "ADMIN"] },
        { name: "강사 관리", href: "/admin/instructors", icon: Users, roles: ["OWNER"] },
        { name: "전체 급여 정산", href: "/owner/payroll", icon: CreditCard, roles: ["OWNER"] },
        { name: "급여 명세서", href: "/instructor/payroll", icon: CreditCard, roles: ["INSTRUCTOR"] },
        { name: "QR 출석 스캐너", href: "/scanner", icon: ScanLine, roles: ["OWNER", "ADMIN", "INSTRUCTOR"] },
        { name: "차량 시간표", href: "/shuttles", icon: Bus, roles: ["OWNER", "ADMIN", "INSTRUCTOR"] },
        { name: "시스템 설정", href: "/owner/settings", icon: Settings, roles: ["OWNER"] },
    ];

    const filteredNav = navigation.filter(item => item.roles.includes(role));

    return (
        <div className="flex h-screen bg-slate-50 print:h-auto print:block">
            {/* Mobile sidebar backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={clsx(
                    "print:hidden",
                    "fixed inset-y-0 left-0 z-30 w-64 bg-blue-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-16 items-center px-6 bg-blue-950 font-bold text-xl tracking-tight overflow-hidden">
                    {dashboardLogoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={dashboardLogoUrl} alt={siteName} className="max-h-12 max-w-full object-contain" />
                    ) : (
                        <span className="text-blue-200 truncate">{siteName || "SeoulTeacher"}</span>
                    )}
                </div>

                <nav className="mt-6 px-3 space-y-1">
                    {filteredNav.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={clsx(
                                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                                    isActive
                                        ? "bg-blue-800 text-white"
                                        : "text-blue-100 hover:bg-blue-800 hover:text-white"
                                )}
                            >
                                <item.icon className={clsx("mr-3 h-5 w-5", isActive ? "text-blue-200" : "text-blue-300")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:overflow-visible">
                {/* Header */}
                <header className="print:hidden bg-white shadow-sm border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                    <button
                        className="text-slate-500 hover:text-slate-700 lg:hidden"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex-1" />

                    <div className="flex items-center space-x-4">
                        <div className="text-sm">
                            <span className="font-semibold text-slate-900">{session?.user?.name}</span>
                            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium border border-blue-200">
                                {role}
                            </span>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-full hover:bg-slate-100"
                            title="로그아웃"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Main Body */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible print:block print:h-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
