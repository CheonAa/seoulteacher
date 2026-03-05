"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

interface LandingHeaderProps {
    logoBase64?: string;
    siteName?: string;
}

export default function LandingHeader({ logoBase64, siteName = "HANOI SEOUL ACADEMY" }: LandingHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white/95 backdrop-blur-sm shadow-sm py-4" : "bg-white py-5"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        {logoBase64 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoBase64} alt={`${siteName} 로고`} className="h-10 object-contain" />
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-xl font-black tracking-tight text-[#0055AB] leading-tight max-w-[200px] truncate">
                                    {siteName}
                                </span>
                            </div>
                        )}
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <a href="#about" className="text-[15px] font-semibold text-slate-700 hover:text-[#0055AB] transition-colors">학원소개</a>
                        <a href="#curriculum" className="text-[15px] font-semibold text-slate-700 hover:text-[#0055AB] transition-colors">커리큘럼</a>
                        <a href="#classes" className="text-[15px] font-semibold text-slate-700 hover:text-[#0055AB] transition-colors">단과클래스</a>
                        <a href="#location" className="text-[15px] font-semibold text-slate-700 hover:text-[#0055AB] transition-colors">오시는 길</a>
                    </nav>

                    {/* Right section (Login / Contact) */}
                    <div className="hidden md:flex items-center space-x-4">
                        <a
                            href="http://pf.kakao.com/_wNXkn" // Kakao Link
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0055AB] font-semibold text-sm px-4 py-2 rounded-full border border-[#0055AB] hover:bg-blue-50 transition-colors"
                        >
                            상담하기
                        </a>
                        <Link
                            href="/login"
                            className="bg-[#0055AB] text-white font-semibold text-sm px-6 py-2 rounded-full hover:bg-blue-800 transition-colors shadow-md shadow-blue-500/20"
                        >
                            로그인하기
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden text-slate-600 hover:text-slate-900"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-slate-100 shadow-lg py-4 px-4 flex flex-col space-y-4">
                    <a href="#about" className="text-sm font-medium text-slate-700 p-2 hover:bg-slate-50 rounded" onClick={() => setIsMobileMenuOpen(false)}>학원소개</a>
                    <a href="#curriculum" className="text-sm font-medium text-slate-700 p-2 hover:bg-slate-50 rounded" onClick={() => setIsMobileMenuOpen(false)}>커리큘럼</a>
                    <a href="#classes" className="text-sm font-medium text-slate-700 p-2 hover:bg-slate-50 rounded" onClick={() => setIsMobileMenuOpen(false)}>단과클래스</a>
                    <a href="#location" className="text-sm font-medium text-slate-700 p-2 hover:bg-slate-50 rounded" onClick={() => setIsMobileMenuOpen(false)}>오시는 길</a>
                    <div className="h-px bg-slate-100 my-2"></div>
                    <Link
                        href="/login"
                        className="block text-center bg-[#0055AB] text-white font-semibold text-sm px-4 py-3 rounded-md"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        로그인하기
                    </Link>
                </div>
            )}
        </header>
    );
}
