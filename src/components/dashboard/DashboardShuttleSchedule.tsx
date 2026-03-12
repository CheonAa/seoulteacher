"use client";

import { useState, useEffect } from "react";
import { Bus, Clock } from "lucide-react";
import clsx from "clsx";

type ScheduleItem = {
    id: string;
    vehicleName: string;
    dayOfWeek: string;
    roundIndex: number;
    runType: "PICKUP" | "DROPOFF";
    time: string;
    locationName: string;
    students: string | null;
    instructorId: string | null;
    color: string | null;
    instructor: {
        name: string;
        color: string | null;
    } | null;
};

const DAYS = [
    { value: "MON", label: "월 (MON)" },
    { value: "TUE", label: "화 (TUE)" },
    { value: "WED", label: "수 (WED)" },
    { value: "THU", label: "목 (THU)" },
    { value: "FRI", label: "금 (FRI)" },
    { value: "SAT", label: "토 (SAT)" },
    { value: "SUN", label: "일 (SUN)" },
];

export default function DashboardShuttleSchedule() {
    const [selectedDay, setSelectedDay] = useState("");
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Set today as default day
        const todayIdx = new Date().getDay();
        // JS Date: 0=Sun, 1=Mon...6=Sat
        const mapping = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        setSelectedDay(mapping[todayIdx]);
    }, []);

    const fetchSchedules = async () => {
        if (!selectedDay) return;
        setLoading(true);
        try {
            // Fetch all vehicles for the selected day
            const res = await fetch(`/api/shuttles?dayOfWeek=${selectedDay}`);
            if (res.ok) {
                const data = await res.json();
                setSchedules(data);
            }
        } catch (error) {
            console.error("Failed to fetch schedules", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedDay) {
            fetchSchedules();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDay]);

    // Group by Vehicle -> RoundIndex -> RunType -> Time -> Location
    const vehiclesData = schedules.reduce((acc, curr) => {
        if (!acc[curr.vehicleName]) {
            acc[curr.vehicleName] = {};
        }
        if (!acc[curr.vehicleName][curr.roundIndex]) {
            acc[curr.vehicleName][curr.roundIndex] = { pickUps: [], dropOffs: [] };
        }

        if (curr.runType === "PICKUP") acc[curr.vehicleName][curr.roundIndex].pickUps.push(curr);
        else acc[curr.vehicleName][curr.roundIndex].dropOffs.push(curr);

        return acc;
    }, {} as Record<string, Record<number, { pickUps: ScheduleItem[], dropOffs: ScheduleItem[] }>>);

    const vehicleKeys = Object.keys(vehiclesData).sort((a, b) => a.localeCompare(b));

    const getBgColor = (item: ScheduleItem) => {
        return item.color || item.instructor?.color || "#E2E8F0";
    };

    // Helper to group flat array of stops into grouped rows by time and location
    const groupStops = (stops: ScheduleItem[]) => {
        // Sort by time first
        const sorted = [...stops].sort((a, b) => a.time.localeCompare(b.time));
        const grouped: { time: string, locationName: string, items: ScheduleItem[] }[] = [];

        sorted.forEach(stop => {
            const existing = grouped.find(g => g.time === stop.time && g.locationName === stop.locationName);
            if (existing) {
                existing.items.push(stop);
            } else {
                grouped.push({ time: stop.time, locationName: stop.locationName, items: [stop] });
            }
        });

        return grouped;
    };

    if (!selectedDay) return null;

    return (
        <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden flex flex-col h-full print:shadow-none print:border-none print:bg-transparent print:h-auto print:block print:overflow-visible">
            {/* Header controls - Hidden in print */}
            <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 print:hidden">
                <div className="flex items-center gap-2">
                    <Bus className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg leading-6 font-bold text-slate-900">오늘의 운행 시간표</h3>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 text-white hover:bg-slate-700 transition"
                    >
                        인쇄 / PDF 저장
                    </button>

                    {/* Days Tab */}
                    <div className="flex overflow-x-auto pb-1 -mx-2 px-2 sm:pb-0 sm:mx-0 sm:px-0 scrollbar-hide">
                        <div className="flex space-x-1">
                            {DAYS.map(d => (
                                <button
                                    key={d.value}
                                    onClick={() => setSelectedDay(d.value)}
                                    className={clsx(
                                        "px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors border",
                                        selectedDay === d.value
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    {d.label.split(' ')[0]} {/* 월, 화, 수 만 표시 */}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Only Header */}
            <div className="hidden print:block mb-6 text-center">
                <h1 className="text-2xl font-bold bg-slate-800 text-white py-2 rounded-t-lg">
                    신나게뛰는 아이들 차량 시간표 ({DAYS.find(d => d.value === selectedDay)?.label})
                </h1>
                <style dangerouslySetInnerHTML={{ __html: `@page { size: A4 landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }` }} />
            </div>

            <div className="p-4 sm:p-6 flex-1 overflow-y-auto print:p-0 print:overflow-visible print:h-auto print:block">
                {loading ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-12 text-slate-500 print:hidden">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p>차량 시간표를 불러오는 중입니다...</p>
                    </div>
                ) : vehicleKeys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300 print:hidden">
                        <Bus className="h-10 w-10 text-slate-400 mb-3" />
                        <p className="font-medium text-slate-700">등록된 차량 운행 일정이 없습니다.</p>
                        <p className="text-sm mt-1">다른 요일을 선택하거나 관리자 페이지에서 일정을 등록해주세요.</p>
                    </div>
                ) : (
                    // On print, force grid to show all vehicles horizontally
                    <div className="space-y-8 print:space-y-0 print:grid print:grid-cols-4 print:gap-4 print:items-start w-full">
                        {vehicleKeys.map(vehicle => {
                            const roundsData = vehiclesData[vehicle];
                            const rounds = Object.keys(roundsData).map(Number).sort((a, b) => a - b);

                            return (
                                <div key={vehicle} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm print:break-inside-avoid print:shadow-none print:border-slate-800 print:rounded-none bg-white">
                                    <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 text-center print:bg-slate-200 print:border-slate-800">
                                        <h4 className="text-md font-bold text-blue-900 print:text-black">
                                            {vehicle}
                                        </h4>
                                    </div>

                                    <div className="divide-y divide-slate-100 print:divide-slate-300">
                                        {rounds.map((roundIdx) => {
                                            const round = roundsData[roundIdx];
                                            const groupedPickups = groupStops(round.pickUps);
                                            const groupedDropoffs = groupStops(round.dropOffs);

                                            return (
                                                <div key={roundIdx} className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-1 print:divide-y print:divide-slate-300">
                                                    {/* Pick Up Column */}
                                                    <div className="p-3 md:border-r border-slate-100 print:border-none print:p-2 bg-white">
                                                        <div className="text-xs font-bold text-slate-600 mb-2 border-b border-slate-200 pb-1 flex justify-between print:text-[10px] print:border-slate-300">
                                                            <span>승차 (Pick-Up)</span>
                                                            <span className="text-slate-400 font-normal">Round {roundIdx}</span>
                                                        </div>
                                                        {groupedPickups.length === 0 ? (
                                                            <div className="text-xs text-slate-400 italic py-1">승차 일정 없음</div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {groupedPickups.map((group, idx) => (
                                                                    <div key={idx} className="flex gap-2 items-start text-sm print:text-xs">
                                                                        <div className="w-10 font-bold text-slate-700 mt-0.5 flex-shrink-0 print:text-black print:w-8">
                                                                            {group.time}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-medium text-slate-900 truncate print:text-black leading-tight">
                                                                                {group.locationName}
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                                                {group.items.flatMap(i => i.students?.split(',').map(s => ({ name: s.trim(), color: getBgColor(i) }))).filter(s => !!s?.name).map((student, sIdx) => (
                                                                                    <span
                                                                                        key={sIdx}
                                                                                        className="px-1 py-0.5 text-[0.6rem] font-bold text-slate-800 rounded shadow-sm border border-slate-200/50 print:border-black/20"
                                                                                        style={{ backgroundColor: student?.color }}
                                                                                    >
                                                                                        {student?.name}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Drop Off Column */}
                                                    <div className="p-3 bg-slate-50/50 print:bg-white print:p-2">
                                                        <div className="text-xs font-bold text-slate-700 mb-2 border-b border-slate-300 pb-1 flex justify-between print:text-[10px]">
                                                            <span>하차 (Drop-Off)</span>
                                                            <span className="text-slate-400 font-normal">Round {roundIdx}</span>
                                                        </div>
                                                        {groupedDropoffs.length === 0 ? (
                                                            <div className="text-xs text-slate-400 italic py-1">하차 일정 없음</div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {groupedDropoffs.map((group, idx) => (
                                                                    <div key={idx} className="flex gap-2 items-start text-sm print:text-xs">
                                                                        <div className="w-10 font-bold text-slate-700 mt-0.5 flex-shrink-0 print:text-black print:w-8">
                                                                            {group.time}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-medium text-slate-900 truncate print:text-black leading-tight">
                                                                                {group.locationName}
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                                                {group.items.flatMap(i => i.students?.split(',').map(s => ({ name: s.trim(), color: getBgColor(i) }))).filter(s => !!s?.name).map((student, sIdx) => (
                                                                                    <span
                                                                                        key={sIdx}
                                                                                        className="px-1 py-0.5 text-[0.6rem] font-bold text-slate-800 rounded shadow-sm border border-slate-200/50 print:border-black/20"
                                                                                        style={{ backgroundColor: student?.color }}
                                                                                    >
                                                                                        {student?.name}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
