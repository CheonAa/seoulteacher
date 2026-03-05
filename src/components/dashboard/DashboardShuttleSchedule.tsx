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

    // Group by Vehicle -> RoundIndex
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

    if (!selectedDay) return null;

    return (
        <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
                <div className="flex items-center gap-2">
                    <Bus className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg leading-6 font-bold text-slate-900">오늘의 운행 시간표</h3>
                </div>

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

            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-12 text-slate-500">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p>차량 시간표를 불러오는 중입니다...</p>
                    </div>
                ) : vehicleKeys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <Bus className="h-10 w-10 text-slate-400 mb-3" />
                        <p className="font-medium text-slate-700">등록된 차량 운행 일정이 없습니다.</p>
                        <p className="text-sm mt-1">다른 요일을 선택하거나 관리자 페이지에서 일정을 등록해주세요.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {vehicleKeys.map(vehicle => {
                            const roundsData = vehiclesData[vehicle];
                            const rounds = Object.keys(roundsData).map(Number).sort((a, b) => a - b);

                            return (
                                <div key={vehicle} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200">
                                        <h4 className="text-md font-bold text-blue-900 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                            {vehicle}
                                        </h4>
                                    </div>

                                    <div className="divide-y divide-slate-100">
                                        {rounds.map((roundIdx, i) => {
                                            const round = roundsData[roundIdx];
                                            return (
                                                <div key={roundIdx} className="grid grid-cols-1 md:grid-cols-2">
                                                    {/* Pick Up Column */}
                                                    <div className="p-4 md:border-r border-slate-100 bg-white">
                                                        <div className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 mb-3 border border-slate-200">
                                                            승차 (Pick-Up)
                                                        </div>
                                                        {round.pickUps.length === 0 ? (
                                                            <div className="text-sm text-slate-400 italic py-2 pl-2">승차 일정 없음</div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {round.pickUps.map((item) => (
                                                                    <div key={item.id} className="flex gap-3 items-start relative pl-2 border-l-2 border-slate-200">
                                                                        <div className="w-12 text-sm font-bold text-slate-700 mt-0.5 flex-shrink-0 flex items-center gap-1">
                                                                            <Clock className="w-3 h-3 text-slate-400" />
                                                                            {item.time}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-sm font-medium text-slate-900 truncate" title={item.locationName}>
                                                                                {item.locationName}
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                                {item.students?.split(',').map((student, sIdx) => {
                                                                                    const trimmed = student.trim();
                                                                                    if (!trimmed) return null;
                                                                                    return (
                                                                                        <span
                                                                                            key={sIdx}
                                                                                            className="px-1.5 py-0.5 text-[0.65rem] font-bold text-slate-800 rounded shadow-sm border border-slate-200/50"
                                                                                            style={{ backgroundColor: getBgColor(item) }}
                                                                                        >
                                                                                            {trimmed}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Drop Off Column */}
                                                    <div className="p-4 bg-slate-50/50">
                                                        <div className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700 mb-3 border border-slate-300">
                                                            하차 (Drop-Off)
                                                        </div>
                                                        {round.dropOffs.length === 0 ? (
                                                            <div className="text-sm text-slate-400 italic py-2 pl-2">하차 일정 없음</div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {round.dropOffs.map((item) => (
                                                                    <div key={item.id} className="flex gap-3 items-start relative pl-2 border-l-2 border-slate-200">
                                                                        <div className="w-12 text-sm font-bold text-slate-700 mt-0.5 flex-shrink-0 flex items-center gap-1">
                                                                            <Clock className="w-3 h-3 text-slate-400" />
                                                                            {item.time}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-sm font-medium text-slate-900 truncate" title={item.locationName}>
                                                                                {item.locationName}
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                                {item.students?.split(',').map((student, sIdx) => {
                                                                                    const trimmed = student.trim();
                                                                                    if (!trimmed) return null;
                                                                                    return (
                                                                                        <span
                                                                                            key={sIdx}
                                                                                            className="px-1.5 py-0.5 text-[0.65rem] font-bold text-slate-800 rounded shadow-sm border border-slate-200/50"
                                                                                            style={{ backgroundColor: getBgColor(item) }}
                                                                                        >
                                                                                            {trimmed}
                                                                                        </span>
                                                                                    );
                                                                                })}
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
