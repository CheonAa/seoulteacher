"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";

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
    });

    schedules.forEach(item => {
        const v = item.vehicleName;
        if (!groupedData[v]) groupedData[v] = {};
        
        const r = item.roundIndex;
        if (!groupedData[v][r]) {
            groupedData[v][r] = { pickUps: [], dropOffs: [] };
        }

        if (item.runType === "PICKUP") {
            groupedData[v][r].pickUps.push(item);
        } else {
            groupedData[v][r].dropOffs.push(item);
        }
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
                {/* 3 Columns Grid */}
                <div className="grid grid-cols-3 gap-8 h-full">
                    {VEHICLES_ORDER.map((vehicle, vIdx) => {
                        const vehicleRoundsMap = groupedData[vehicle];
                        const rounds = Object.keys(vehicleRoundsMap).map(Number).sort((a,b) => a-b);
                        const vNum = vehicle.charAt(0);
                        const phoneInfo = PHONE_NUMBERS[vehicle] ? `/ ${PHONE_NUMBERS[vehicle]}` : "";

                        return (
                            <div key={vehicle} className="flex flex-col h-full border-r-[3px] border-yellow-400 last:border-r-0 pr-4 last:pr-0">
                                {/* Header */}
                                <div className="text-center mb-2 relative">
                                    {/* Date Stamp Top Right */}
                                    <div className="absolute -top-2 right-0 text-[10px] text-gray-500 uppercase">{formattedDateHeader}</div>
                                    
                                    <h2 className="text-[17px] font-bold text-[#1a5b8e]">
                                        {vNum}호 차량 / Xe số {vNum} {phoneInfo}
                                    </h2>
                                    <h3 className="text-sm font-bold mt-0.5 text-black">
                                        {targetKorDay} <span className="ml-4 uppercase">{targetDay}</span>
                                    </h3>
                                </div>

                                <div className="flex text-[11px] font-bold text-black text-center mb-1">
                                    <div className="flex-1">Pick-Up</div>
                                    <div className="flex-1">Drop_off</div>
                                </div>

                                {/* Rounds Data */}
                                <div className="flex flex-col flex-1">
                                    {rounds.map((round, rIdx) => {
                                        const rData = vehicleRoundsMap[round];
                                        const isLast = rIdx === rounds.length - 1;
                                        return (
                                            <div 
                                                key={round} 
                                                className={`flex border-b-2 border-black border-dotted ${isLast ? 'border-none' : 'pb-2 mb-2'} pt-1`}
                                            >
                                                {/* Pick-Up Side */}
                                                <div className="w-1/2 pr-1 border-r border-black flex flex-col gap-1.5">
                                                    {rData.pickUps.map((item, idx) => (
                                                        <div key={idx} className="flex items-start text-[10px]">
                                                            <div className="w-9 font-bold flex-shrink-0 text-black">{item.time}</div>
                                                            <div className="flex-1 font-bold truncate pr-1">{item.locationName}</div>
                                                            <div className="w-14 flex-shrink-0 flex flex-col items-end gap-[1px]">
                                                                {item.students?.split(',').map((student, sIdx) => {
                                                                    const trimmed = student.trim();
                                                                    if(!trimmed) return null;
                                                                    return (
                                                                        <span 
                                                                            key={sIdx} 
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
                                                <div className="w-1/2 pl-2 flex flex-col gap-1.5">
                                                    {rData.dropOffs.map((item, idx) => (
                                                        <div key={idx} className="flex items-start text-[10px]">
                                                            <div className="w-9 font-bold flex-shrink-0 text-black">{item.time}</div>
                                                            <div className="flex-1 font-bold truncate pr-1">{item.locationName}</div>
                                                            <div className="w-14 flex-shrink-0 flex flex-col items-end gap-[1px]">
                                                                {item.students?.split(',').map((student, sIdx) => {
                                                                    const trimmed = student.trim();
                                                                    if(!trimmed) return null;
                                                                    return (
                                                                        <span 
                                                                            key={sIdx} 
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
                                        )
                                    })}
                                </div>
                            </div>
                        )
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
