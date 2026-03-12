"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bus, Settings2, UploadCloud, Loader2, CheckCircle2, Printer } from "lucide-react";
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

const DAYS_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const KOR_DAYS = {
    "MON": "월요일", "TUE": "화요일", "WED": "수요일", "THU": "목요일", "FRI": "금요일", "SAT": "토요일", "SUN": "일요일"
};

const VEHICLES = ["1호 차량", "3호 차량", "5호 차량", "기타 차량"];

export default function ShuttlesViewerPage() {
    const { data: session } = useSession();
    const role = session?.user?.role || "GUEST";
    const canManage = role === "ADMIN" || role === "OWNER";


    // Date Selection State (defaults to today)
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISOTime = new Date(today.getTime() - tzOffset).toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(localISOTime);
    
    // Derived selected day
    const getDerivedDay = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "TUE"; // Fallback
        return DAYS_MAP[d.getDay()];
    };
    const selectedDay = getDerivedDay(selectedDate);

    const [selectedVehicle, setSelectedVehicle] = useState("1호 차량");
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Image Upload State
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/shuttles?dayOfWeek=${selectedDay}&vehicleName=${encodeURIComponent(selectedVehicle)}`);
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
        fetchSchedules();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, selectedVehicle]);

    // Group by RoundIndex
    const roundGroups = schedules.reduce((acc, curr) => {
        if (!acc[curr.roundIndex]) {
            acc[curr.roundIndex] = { pickUps: [], dropOffs: [] };
        }
        if (curr.runType === "PICKUP") acc[curr.roundIndex].pickUps.push(curr);
        else acc[curr.roundIndex].dropOffs.push(curr);
        return acc;
    }, {} as Record<number, { pickUps: ScheduleItem[], dropOffs: ScheduleItem[] }>);

    const rounds = Object.keys(roundGroups).map(Number).sort((a, b) => a - b);

    // Simple helper to pick the right bg color based on hex string or fallback
    const getBgColor = (item: ScheduleItem) => {
        return item.color || item.instructor?.color || "#E2E8F0"; // slate-200 Default
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Ensure it's an image
        if (!file.type.startsWith('image/')) {
            setUploadError("이미지 파일만 업로드 가능합니다.");
            return;
        }

        // Limit size to 5MB (for base64 string storage via Prisma)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError("이미지 크기는 최대 5MB까지만 지원됩니다.");
            return;
        }

        setUploading(true);
        setUploadError(null);
        setUploadSuccess(false);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64String = reader.result as string;

            try {
                const res = await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        key: "SHUTTLE_MAP_IMAGE",
                        value: base64String
                    })
                });

                if (!res.ok) throw new Error("업로드 실패");

                setUploadSuccess(true);
                setTimeout(() => setUploadSuccess(false), 3000);
            } catch (err: any) {
                setUploadError(err.message);
            } finally {
                setUploading(false);
            }
        };
        reader.onerror = () => {
            setUploadError("파일을 읽는 도중 오류가 발생했습니다.");
            setUploading(false);
        };
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Bus className="w-6 h-6 text-blue-600" />
                        차량 시간표 조회
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        요일별, 차량별 운행 일정 및 탑승 학생 정보를 확인합니다.
                    </p>
                </div>
                {canManage && (
                    <Link
                        href="/admin/shuttles"
                        className="inline-flex items-center px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-md hover:bg-slate-700 transition"
                    >
                        <Settings2 className="w-4 h-4 mr-2" />
                        시간표 관리
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 shadow-sm border border-slate-200 rounded-lg space-y-4">
                {/* Vehicles Tab */}
                <div className="flex flex-wrap gap-2">
                    {VEHICLES.map(v => (
                        <button
                            key={v}
                            onClick={() => setSelectedVehicle(v)}
                            className={clsx(
                                "px-4 py-2 text-sm font-medium rounded-full transition-colors",
                                selectedVehicle === v
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            )}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                {/* Date Picker & Print button */}
                <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-slate-200 mt-4 pt-4 sm:border-0 sm:mt-0 sm:pt-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 text-sm whitespace-nowrap">조회 일자:</span>
                        <input 
                            type="date" 
                            name="datePicker"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 hover:bg-white transition shadow-sm"
                        />
                    </div>
                    
                    <Link
                        href={`/shuttles/print?date=${selectedDate}`}
                        target="_blank"
                        className="inline-flex flex-1 sm:flex-none justify-center items-center px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-bold rounded hover:bg-indigo-100 hover:text-indigo-800 transition shadow-sm"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        A4 가로 인쇄형 보기 ({KOR_DAYS[selectedDay as keyof typeof KOR_DAYS]})
                    </Link>
                </div>
            </div>

            {/* Timetable Header */}
            <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-2">
                    <h2 className="text-xl font-bold text-blue-900">
                        {selectedVehicle} / Xe số {selectedVehicle.charAt(0)}
                    </h2>
                    <div className="text-slate-600 font-medium">
                        <span className="text-lg text-slate-800 mr-2">{selectedDate}</span>
                        <span className="bg-slate-200 px-2 py-1 rounded text-sm text-slate-700 font-bold">{KOR_DAYS[selectedDay as keyof typeof KOR_DAYS]} / {selectedDay}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500">시간표를 불러오는 중...</div>
                ) : rounds.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 border-t border-slate-200">
                        등록된 차량 시간표가 없습니다.
                    </div>
                ) : (
                    <div className="p-0">
                        {rounds.map((roundIdx, i) => {
                            const round = roundGroups[roundIdx];
                            return (
                                <div key={roundIdx} className={clsx(
                                    "grid grid-cols-1 md:grid-cols-2",
                                    i !== rounds.length - 1 ? "border-b border-dashed border-slate-300" : ""
                                )}>
                                    {/* Pick Up Column */}
                                    <div className="p-6 md:border-r border-slate-300 relative">
                                        {i === 0 && <div className="absolute top-0 left-0 w-full text-center mt-2 font-bold text-slate-700 hidden md:block">Pick-Up</div>}
                                        <div className={clsx("space-y-4", i === 0 ? "mt-8" : "")}>
                                            <div className="md:hidden font-bold text-slate-500 mb-2 border-b pb-1">Pick-Up</div>
                                            {round.pickUps.length === 0 ? (
                                                <div className="text-sm text-slate-400 italic py-2">승차 일정 없음</div>
                                            ) : (
                                                round.pickUps.map((item) => (
                                                    <div key={item.id} className="flex gap-4 items-start text-sm">
                                                        <div className="w-12 font-bold text-slate-900 flex-shrink-0">{item.time}</div>
                                                        <div className="flex-1 font-medium text-slate-800">{item.locationName}</div>
                                                        <div className="w-24 flex-shrink-0 flex flex-col gap-1">
                                                            {item.students?.split(',').map((student, sIdx) => {
                                                                const trimmed = student.trim();
                                                                if (!trimmed) return null;
                                                                return (
                                                                    <span
                                                                        key={sIdx}
                                                                        className="px-2 py-1 text-xs font-bold text-slate-800 rounded text-center"
                                                                        style={{ backgroundColor: getBgColor(item) }}
                                                                    >
                                                                        {trimmed}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Drop Off Column */}
                                    <div className="p-6 relative bg-slate-50/50">
                                        {i === 0 && <div className="absolute top-0 left-0 w-full text-center mt-2 font-bold text-slate-700 hidden md:block">Drop_off</div>}
                                        <div className={clsx("space-y-4", i === 0 ? "mt-8" : "")}>
                                            <div className="md:hidden font-bold text-slate-500 mb-2 border-b pb-1">Drop_off</div>
                                            {round.dropOffs.length === 0 ? (
                                                <div className="text-sm text-slate-400 italic py-2">하차 일정 없음</div>
                                            ) : (
                                                round.dropOffs.map((item) => (
                                                    <div key={item.id} className="flex gap-4 items-start text-sm">
                                                        <div className="w-12 font-bold text-slate-900 flex-shrink-0">{item.time}</div>
                                                        <div className="flex-1 font-medium text-slate-800">{item.locationName}</div>
                                                        <div className="w-24 flex-shrink-0 flex flex-col gap-1">
                                                            {item.students?.split(',').map((student, sIdx) => {
                                                                const trimmed = student.trim();
                                                                if (!trimmed) return null;
                                                                return (
                                                                    <span
                                                                        key={sIdx}
                                                                        className="px-2 py-1 text-xs font-bold text-slate-800 rounded text-center"
                                                                        style={{ backgroundColor: getBgColor(item) }}
                                                                    >
                                                                        {trimmed}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Shuttle Map Image Upload (Admin/Owner only) */}
            {canManage && (
                <div className="bg-white p-6 shadow-sm border border-slate-200 rounded-lg mt-8 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                노선도 이미지 변경
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                메인 화면(랜딩 페이지)의 하단 차량 노선도 이미지를 최신으로 교체합니다. (최대 5MB)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="file"
                                id="map-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                            <label
                                htmlFor="map-upload"
                                className={clsx(
                                    "inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition",
                                    uploading ? "opacity-50 cursor-not-allowed" : ""
                                )}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        업로드 중...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-4 h-4 text-blue-600" />
                                        새 이미지 업로드
                                    </>
                                )}
                            </label>
                        </div>

                        {uploadSuccess && (
                            <span className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full animate-in fade-in duration-300">
                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                방금 업로드되었습니다! (메인 화면에서 확인 가능)
                            </span>
                        )}

                        {uploadError && (
                            <span className="text-sm text-red-600 font-medium">
                                {uploadError}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
