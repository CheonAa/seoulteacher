"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { getRoundByTime, TARGET_ROUNDS, ROUND_LABELS } from "@/lib/shuttleUtils";

type ScheduleItem = {
    id: string;
    vehicleName: string;
    dayOfWeek: string;
    roundIndex: number;
    runType: "PICKUP" | "DROPOFF";
    time: string;
    locationName: string;
    students: string | null;
    color: string | null;
    instructor: {
        name: string;
        color: string | null;
    } | null;
};

const DAYS_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const KOR_DAYS = {
    "MON": "월", "TUE": "화", "WED": "수", "THU": "목", "FRI": "금", "SAT": "토", "SUN": "일"
};

const VEHICLES_ORDER = ["1호 차량", "3호 차량", "5호 차량"];
const PHONE_NUMBERS: Record<string, string> = {
    "1호 차량": "0397 262 759",
    "3호 차량": "0961 313 283",
    "5호 차량": ""
};

export default function PrintScheduleClient() {
    const searchParams = useSearchParams();
    const dateQuery = searchParams.get("date");
    
    // Default to today if no date provided
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISOTime = new Date(today.getTime() - tzOffset).toISOString().split('T')[0];
    const displayDate = dateQuery || localISOTime;

    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);

    const getDerivedDay = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "TUE";
        return DAYS_MAP[d.getDay()];
    };

    const targetDay = getDerivedDay(displayDate);
    const targetKorDay = KOR_DAYS[targetDay as keyof typeof KOR_DAYS];

    // Format Date string cleanly 
    const dObj = new Date(displayDate);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDateHeader = isNaN(dObj.getTime()) ? displayDate : `${dObj.getDate()} ${months[dObj.getMonth()]} ${dObj.getFullYear()}`;

    useEffect(() => {
        const fetchAllForDay = async () => {
            setLoading(true);
            try {
                // Fetching without vehicleName returns all vehicles for that day
                const res = await fetch(`/api/shuttles?dayOfWeek=${targetDay}`);
                if (res.ok) {
                    const data = await res.json();
                    setSchedules(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllForDay();
    }, [targetDay]);

    const getBgColor = (item: ScheduleItem) => {
        return item.color || item.instructor?.color || "transparent";
    };

    if (loading) return <div className="p-12 text-center text-slate-500">시간표 데이터를 불러오는 중입니다...</div>;

    // Grouping structure: by Vehicle -> then by Round -> { pickups, dropoffs }
    const groupedData: Record<string, Record<number, { pickUps: ScheduleItem[], dropOffs: ScheduleItem[] }>> = {};

    VEHICLES_ORDER.forEach(v => {
        groupedData[v] = {};
        TARGET_ROUNDS.forEach(r => {
            groupedData[v][r] = { pickUps: [], dropOffs: [] };
        });
    });

    schedules.forEach(item => {
        const v = item.vehicleName;
        if (!groupedData[v]) {
            groupedData[v] = { 1: { pickUps: [], dropOffs: [] }, 2: { pickUps: [], dropOffs: [] }, 3: { pickUps: [], dropOffs: [] }, 4: { pickUps: [], dropOffs: [] } };
        }
        
        const r = getRoundByTime(item.time, item.runType);

        if (item.runType === "PICKUP") {
            groupedData[v][r].pickUps.push(item);
        } else {
            groupedData[v][r].dropOffs.push(item);
        }
    });

    // Sort times inside each round
    Object.keys(groupedData).forEach(v => {
        TARGET_ROUNDS.forEach(r => {
            if (groupedData[v][r]) {
                groupedData[v][r].pickUps.sort((a, b) => a.time.localeCompare(b.time));
                groupedData[v][r].dropOffs.sort((a, b) => a.time.localeCompare(b.time));
            }
        });
    });

    return (
        <div className="bg-white text-black min-h-screen">
            {/* Minimal Top Nav (Hidden in Print) */}
            <div className="print:hidden bg-slate-100 p-4 border-b flex justify-between items-center mb-4">
                <div className="text-sm text-slate-600">
                    A4 가로 방향으로 설정하여 인쇄해주세요. <br/>
                    <span className="text-xs text-red-500 font-bold">* 브라우저 인쇄 설정에서 "배경 그래픽(Background graphics)"을 반드시 켜주세요.</span>
                </div>
                <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md shadow font-bold transition"
                >
                    <Printer className="w-5 h-5"/>
                    인쇄하기
                </button>
            </div>

            {/* A4 Landscape Container */}
            <div className="mx-auto w-[297mm] h-[209mm] bg-white p-[10mm] relative box-border overflow-hidden print:w-full print:h-full print:p-0 print:m-0">
                {/* 3 Columns Grid (Restructured into Row-by-Row for Perfect Alignment) */}
                <div className="grid grid-cols-3 gap-x-8 grid-rows-[auto_auto_1fr_1fr_1fr_1fr] h-full">
                    
                    {/* Row 1: Headers */}
                    {VEHICLES_ORDER.map((vehicle, vIdx) => {
                        const vNum = vehicle.charAt(0);
                        const phoneInfo = PHONE_NUMBERS[vehicle] ? `/ ${PHONE_NUMBERS[vehicle]}` : "";
                        
                        return (
                            <div key={`header-${vehicle}`} className="border-r-[3px] border-yellow-400 last:border-r-0 pr-4 last:pr-0">
                                <div className="text-center mb-2 relative">
                                    {/* Date Stamp Top Right */}
                                    {vIdx === 2 && <div className="absolute -top-2 right-0 text-[10px] text-gray-500 uppercase">{formattedDateHeader}</div>}
                                    
                                    <h2 className="text-[17px] font-bold text-[#1a5b8e]">
                                        {vNum}호 차량 / Xe số {vNum} {phoneInfo}
                                    </h2>
                                    <h3 className="text-sm font-bold mt-0.5 text-black">
                                        {targetKorDay} <span className="ml-4 uppercase">{targetDay}</span>
                                    </h3>
                                </div>
                            </div>
                        );
                    })}

                    {/* Row 2: Title Bars */}
                    {VEHICLES_ORDER.map((vehicle) => (
                        <div key={`title-${vehicle}`} className="border-r-[3px] border-yellow-400 last:border-r-0 pr-4 last:pr-0">
                            <div className="flex text-[11px] font-bold text-black text-center mb-1 bg-gray-100 border-y border-black py-0.5">
                                <div className="flex-1 border-r border-black">등원 (Pick-Up)</div>
                                <div className="flex-1">하원 (Drop-Off)</div>
                            </div>
                        </div>
                    ))}

                    {/* Rows 3-6: Rounds */}
                    {TARGET_ROUNDS.map((round, rIdx) => {
                        const isLast = rIdx === TARGET_ROUNDS.length - 1;
                        const label = ROUND_LABELS[round];

                        return VEHICLES_ORDER.map((vehicle) => {
                            const rData = groupedData[vehicle]?.[round] || { pickUps: [], dropOffs: [] };
                            
                            return (
                                <div 
                                    key={`round-${round}-${vehicle}`} 
                                    className={`border-r-[3px] border-yellow-400 last:border-r-0 pr-4 last:pr-0 flex border-black ${!isLast ? 'border-b pb-1 mb-1' : ''} pt-1 overflow-hidden`}
                                >
                                    {/* Pick-Up Side */}
                                    <div className="w-1/2 pr-1 border-r border-black flex flex-col gap-1.5 relative overflow-hidden">
                                        <div className="text-[10px] font-bold text-blue-800 mb-0.5 border-b border-dashed border-gray-300 pb-0.5 flex-shrink-0">
                                            {round}R - {label?.pickUp || ""}
                                        </div>
                                        {rData.pickUps.map((item, idx) => (
                                            <div key={`pu-${idx}`} className="flex items-start text-[10px]">
                                                <div className="w-9 font-bold flex-shrink-0 text-black">{item.time}</div>
                                                <div className="flex-1 font-bold truncate pr-1">{item.locationName}</div>
                                                <div className="w-14 flex-shrink-0 flex flex-col items-end gap-[1px]">
                                                    {item.students?.split(',').map((student, sIdx) => {
                                                        const trimmed = student.trim();
                                                        if(!trimmed) return null;
                                                        return (
                                                            <span 
                                                                key={`pu-stu-${sIdx}`} 
                                                                className="px-1 text-[9px] font-bold border border-transparent leading-snug whitespace-nowrap min-w-[34px] text-center"
                                                                style={{ backgroundColor: getBgColor(item) !== "transparent" ? getBgColor(item) : undefined }}
                                                            >
                                                                {trimmed}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Drop-Off Side */}
                                    <div className="w-1/2 pl-2 flex flex-col gap-1.5 relative overflow-hidden">
                                        <div className="text-[10px] font-bold text-red-800 mb-0.5 border-b border-dashed border-gray-300 pb-0.5 flex-shrink-0">
                                            {round}R - {label?.dropOff || ""}
                                        </div>
                                        {rData.dropOffs.map((item, idx) => (
                                            <div key={`do-${idx}`} className="flex items-start text-[10px]">
                                                <div className="w-9 font-bold flex-shrink-0 text-black">{item.time}</div>
                                                <div className="flex-1 font-bold truncate pr-1">{item.locationName}</div>
                                                <div className="w-14 flex-shrink-0 flex flex-col items-end gap-[1px]">
                                                    {item.students?.split(',').map((student, sIdx) => {
                                                        const trimmed = student.trim();
                                                        if(!trimmed) return null;
                                                        return (
                                                            <span 
                                                                key={`do-stu-${sIdx}`} 
                                                                className="px-1 text-[9px] font-bold border border-transparent leading-snug whitespace-nowrap min-w-[34px] text-center"
                                                                style={{ backgroundColor: getBgColor(item) !== "transparent" ? getBgColor(item) : undefined }}
                                                            >
                                                                {trimmed}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        });
                    })}
                </div>
            </div>

            {/* Print specific CSS override to force A4 Landscape and hide scrollbars */}
            <style jsx global>{`
                @page {
                    size: A4 landscape;
                    margin: 10mm;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white;
                    }
                }
            `}</style>
        </div>
    );
}
