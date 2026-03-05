"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone, Clock } from "lucide-react";

export default function LocationSection() {
    const [mapImageUrl, setMapImageUrl] = useState<string>("/assets/footer/shuttle-map.png");

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    if (data.SHUTTLE_MAP_IMAGE) {
                        setMapImageUrl(data.SHUTTLE_MAP_IMAGE);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch shuttle map image", err);
            }
        };
        fetchSettings();
    }, []);

    return (
        <section className="py-24 bg-slate-50" id="location">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="text-center mb-16">
                    <h2 className="text-[#0055AB] font-bold text-sm tracking-widest uppercase mb-3">Location & Contact</h2>
                    <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
                        하노이 곳곳을 운행합니다
                    </h3>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                        안전하고 편리한 통학을 위해 하노이 주요 거점을 연결하는 셔틀버스를 운행하고 있습니다.
                    </p>
                </div>

                {/* Shuttle Poster Section */}
                <div className="mb-24 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                    <img
                        src={mapImageUrl}
                        alt="서울학원 셔틀 노선도 안내"
                        className="w-full h-auto object-contain bg-white"
                    />
                </div>

                <div className="flex flex-col lg:flex-row bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">

                    {/* Info Side */}
                    <div className="lg:w-[45%] p-10 md:p-14 bg-[#0055AB] text-white flex flex-col justify-center">
                        <h4 className="text-2xl font-bold mb-8">HANOI SEOUL ACADEMY</h4>

                        <ul className="space-y-8">
                            <li className="flex items-start gap-4">
                                <div className="bg-white/10 p-3 rounded-lg flex-shrink-0">
                                    <MapPin className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-blue-200 mb-1">주소</p>
                                    <p className="text-lg font-medium">
                                        A14 Fivestar Mỹ Đình, Ngõ 154 Đình Thôn, <br />
                                        Phường Cầu Giấy, TP. Hà Nội, Việt Nam
                                    </p>
                                </div>
                            </li>

                            <li className="flex items-start gap-4">
                                <div className="bg-white/10 p-3 rounded-lg flex-shrink-0">
                                    <Phone className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-blue-200 mb-1">수강 문의</p>
                                    <p className="text-lg font-medium">083-420-1004</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-4">
                                <div className="bg-white/10 p-3 rounded-lg flex-shrink-0">
                                    <Clock className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-blue-200 mb-1">운영 시간</p>
                                    <p className="text-lg font-medium">Mon - Fri: 14:00 - 22:00</p>
                                    <p className="text-lg font-medium">Sat - Sun: 09:00 - 18:00</p>
                                </div>
                            </li>
                        </ul>

                        <div className="mt-12 pt-8 border-t border-white/20">
                            <a
                                href="http://pf.kakao.com/_wNXkn"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2 py-4 bg-yellow-400 text-slate-900 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
                            >
                                수강 문의 및 상담하기
                            </a>
                        </div>
                    </div>

                    {/* Map Side */}
                    <div className="lg:w-[55%] min-h-[400px] lg:min-h-full relative bg-slate-200">
                        {/* Displaying an inline iframe for Google Maps; using Hanoi location as placeholder */}
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.6360341793744!2d105.77343977507982!3d21.018445588383!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313454a963cd166b%3A0xfa56e776b7509006!2z7ISc7Jq47ZWZ7JuQIEhhbm9pIFNlb3VsIEFjYWRlbXk!5e0!3m2!1sko!2skr!4v1709664567234!5m2!1sko!2skr"
                            className="absolute inset-0 w-full h-full border-0"
                            allowFullScreen={false}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                    </div>

                </div>
            </div>
        </section>
    );
}
