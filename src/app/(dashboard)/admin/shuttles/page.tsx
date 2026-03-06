"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Plus, Trash2, ArrowLeft, Bus, Upload, Download } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import * as xlsx from "xlsx";

type ScheduleItem = {
    id?: string; // Optional since it might be new
    vehicleName: string;
    dayOfWeek: string;
    roundIndex: number;
    runType: "PICKUP" | "DROPOFF";
    time: string;
    locationName: string;
    students: string;
    instructorId: string | null;
    color: string;
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

const VEHICLES = ["1호 차량", "3호 차량", "5호 차량", "기타 차량"];

// A curated list of elegant pastels for instructors
const PRESET_COLORS = [
    "#fecaca", "#fef08a", "#bbf7d0", "#bfdbfe", "#e9d5ff",
    "#fbcfe8", "#fed7aa", "#d9f99d", "#a7f3d0", "#bae6fd",
    "#ddd6fe", "#f5d0fe", "#fecdd3", "#e2e8f0"
];

export default function AdminShuttlePage() {
    const [selectedDay, setSelectedDay] = useState("TUE");
    const [selectedVehicle, setSelectedVehicle] = useState("1호 차량");

    const [instructors, setInstructors] = useState<{ id: string, name: string, color: string | null }[]>([]);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchInstructors = async () => {
        try {
            const res = await fetch("/api/admin/instructors");
            if (res.ok) {
                const data = await res.json();
                setInstructors(data);
            }
        } catch (e) {
            console.error("Failed to load instructors", e);
        }
    };

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/shuttles?dayOfWeek=${selectedDay}&vehicleName=${encodeURIComponent(selectedVehicle)}`);
            if (res.ok) {
                const data = await res.json();
                // Ensure nulls are converted to empty strings for inputs
                const mapped = data.map((d: ScheduleItem & { instructor?: { color: string | null } }) => ({
                    ...d,
                    students: d.students || "",
                    color: d.color || d.instructor?.color || "#e2e8f0",
                }));
                setSchedules(mapped);
            }
        } catch (error) {
            console.error("Failed to fetch schedules", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstructors();
    }, []);

    useEffect(() => {
        fetchSchedules();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDay, selectedVehicle]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            // Clean up empty records and strings
            const cleanSchedules = schedules.filter(s => s.time.trim() || s.locationName.trim() || s.students.trim()).map(s => ({
                ...s,
                students: s.students.trim() || null,
            }));

            const res = await fetch("/api/shuttles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dayOfWeek: selectedDay,
                    vehicleName: selectedVehicle,
                    schedules: cleanSchedules,
                }),
            });

            if (res.ok) {
                setMessage({ type: "success", text: "시간표가 성공적으로 저장되었습니다." });
                fetchSchedules(); // Reload IDs
            } else {
                setMessage({ type: "error", text: "저장에 실패했습니다." });
            }
        } catch {
            setMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadTemplate = () => {
        // Create an array with headers and one or two sample rows
        const templateData = [
            {
                "요일": "TUE",
                "차량명": "1호 차량",
                "회차": 1,
                "구분": "PICKUP",
                "시간": "16:45",
                "장소": "Royal City R5",
                "학생명": "진소율, 윤재희",
                "강사명": "",
                "색상": "#bae6fd"
            },
            {
                "요일": "TUE",
                "차량명": "1호 차량",
                "회차": 1,
                "구분": "DROPOFF",
                "시간": "17:35",
                "장소": "강남, 정문재",
                "학생명": "심윤후",
                "강사명": "",
                "색상": "#e9d5ff"
            }
        ];

        const worksheet = xlsx.utils.json_to_sheet(templateData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "시간표 양식");

        // Auto-size columns loosely based on Korean text
        const wscols = [
            { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
            { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 10 }
        ];
        worksheet['!cols'] = wscols;

        xlsx.writeFile(workbook, "차량시간표_양식.xlsx");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('업로드 시 기존 차량 시간표 데이터가 모두 지워지고 이 엑셀 파일의 내용으로 덮어써집니다. 계속하시겠습니까?')) {
            e.target.value = ''; // reset input
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/shuttles/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message || '업로드 성공' });
                fetchSchedules(); // refresh data
            } else {
                setMessage({ type: 'error', text: data.error || '업로드 실패' });
            }
        } catch {
            setMessage({ type: 'error', text: '파일 업로드 중 오류가 발생했습니다.' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const addRound = () => {
        const maxRound = schedules.length > 0 ? Math.max(...schedules.map(s => s.roundIndex)) : 0;
        const newRound = maxRound + 1;

        // Auto-add one empty pickup and dropoff for the new round
        setSchedules(prev => [
            ...prev,
            { vehicleName: selectedVehicle, dayOfWeek: selectedDay, roundIndex: newRound, runType: "PICKUP", time: "", locationName: "", students: "", instructorId: null, color: "#e2e8f0" },
            { vehicleName: selectedVehicle, dayOfWeek: selectedDay, roundIndex: newRound, runType: "DROPOFF", time: "", locationName: "", students: "", instructorId: null, color: "#e2e8f0" },
        ]);
    };

    const removeRound = (roundIdx: number) => {
        if (!confirm(`${roundIdx}회차 일정을 모두 삭제하시겠습니까?`)) return;
        setSchedules(prev => prev.filter(s => s.roundIndex !== roundIdx));
    };

    const addStop = (roundIdx: number, type: "PICKUP" | "DROPOFF") => {
        setSchedules(prev => [
            ...prev,
            { vehicleName: selectedVehicle, dayOfWeek: selectedDay, roundIndex: roundIdx, runType: type, time: "", locationName: "", students: "", instructorId: null, color: "#e2e8f0" },
        ]);
    };

    const removeStop = (idx: number) => {
        setSchedules(prev => prev.filter((_, i) => i !== idx));
    };

    const updateStop = (idx: number, field: keyof ScheduleItem, value: string | null) => {
        setSchedules(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };

            // If instructor changes, try to auto-map color if we have one (or user set a default)
            if (field === "instructorId" && value) {
                const inst = instructors.find(i => i.id === value);
                if (inst && inst.color) {
                    next[idx].color = inst.color;
                }
            }

            // Auto-sync vehicle/day in case tabs changed rapidly
            next[idx].vehicleName = selectedVehicle;
            next[idx].dayOfWeek = selectedDay;

            return next;
        });
    };

    // Group schedules for rendering
    const roundGroups = schedules.reduce((acc, curr, globalIdx) => {
        if (!acc[curr.roundIndex]) {
            acc[curr.roundIndex] = { pickUps: [], dropOffs: [] };
        }
        if (curr.runType === "PICKUP") acc[curr.roundIndex].pickUps.push({ item: curr, globalIdx });
        else acc[curr.roundIndex].dropOffs.push({ item: curr, globalIdx });
        return acc;
    }, {} as Record<number, { pickUps: { item: ScheduleItem, globalIdx: number }[], dropOffs: { item: ScheduleItem, globalIdx: number }[] }>);

    const rounds = Object.keys(roundGroups).map(Number).sort((a, b) => a - b);

    const renderStopInputs = (runType: "PICKUP" | "DROPOFF", stops: { item: ScheduleItem, globalIdx: number }[], roundIdx: number) => (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <h4 className="font-semibold text-slate-700">{runType === "PICKUP" ? "승차 (Pick-Up)" : "하차 (Drop-Off)"}</h4>
                <button
                    onClick={() => addStop(roundIdx, runType)}
                    className="text-xs bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded border border-slate-200 flex items-center gap-1"
                >
                    <Plus className="w-3 h-3" /> 추가
                </button>
            </div>

            {stops.length === 0 ? (
                <div className="text-sm text-slate-400 italic">일정이 없습니다.</div>
            ) : (
                stops.map(({ item, globalIdx }) => (
                    <div key={globalIdx} className="bg-white border text-sm border-slate-200 rounded p-3 shadow-sm flex flex-col gap-2 relative group hover:border-blue-300 transition-colors">
                        <button
                            onClick={() => removeStop(globalIdx)}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-sm"
                            title="삭제"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>

                        <div className="flex gap-2">
                            <input
                                type="time"
                                value={item.time}
                                onChange={(e) => updateStop(globalIdx, "time", e.target.value)}
                                className="w-24 border border-slate-300 rounded px-2 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <input
                                type="text"
                                placeholder="장소 (예: Royal City)"
                                value={item.locationName}
                                onChange={(e) => updateStop(globalIdx, "locationName", e.target.value)}
                                className="flex-1 border border-slate-300 rounded px-2 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                placeholder="학생명 (예: 김철수, 이영희)"
                                value={item.students}
                                onChange={(e) => updateStop(globalIdx, "students", e.target.value)}
                                className="flex-1 border border-slate-300 rounded px-2 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                style={{ backgroundColor: item.color }}
                            />

                            {/* Color logic: Link to instructor OR pick explicit color */}
                            <select
                                value={item.instructorId || ""}
                                onChange={(e) => updateStop(globalIdx, "instructorId", e.target.value || null)}
                                className="w-24 border border-slate-300 rounded px-1 py-1 text-xs text-slate-700"
                            >
                                <option value="">강사 선택</option>
                                {instructors.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                            </select>

                            {/* Color Picker square */}
                            <div className="relative group/picker cursor-pointer">
                                <div className="w-6 h-6 rounded border border-slate-400" style={{ backgroundColor: item.color }} />
                                <div className="absolute right-0 bottom-full mb-1 hidden group-hover/picker:grid grid-cols-5 gap-1 bg-white border border-slate-200 shadow-xl rounded p-2 z-10 w-40">
                                    {PRESET_COLORS.map(color => (
                                        <div
                                            key={color}
                                            className="w-5 h-5 rounded cursor-pointer border border-slate-200 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            onClick={() => updateStop(globalIdx, "color", color)}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={item.color}
                                        onChange={(e) => updateStop(globalIdx, "color", e.target.value)}
                                        className="col-span-5 w-full h-6 mt-1 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/shuttles" className="text-slate-500 hover:text-slate-900 p-1 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <Bus className="w-6 h-6 text-indigo-600" />
                            차량 시간표 편집
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-8">
                        차량별 운행 정보를 입력하고 편집합니다. 배경색을 지정해 강사를 구분할 수 있습니다.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {message && (
                        <span className={clsx("text-sm font-medium", message.type === "success" ? "text-emerald-600" : "text-red-600")}>
                            {message.text}
                        </span>
                    )}

                    <div className="flex items-center bg-slate-100 rounded-md p-1 border border-slate-200">
                        <button
                            onClick={handleDownloadTemplate}
                            title="엑셀 양식 다운로드"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        >
                            <Download className="w-5 h-5" />
                        </button>

                        <div className="w-[1px] h-6 bg-slate-300 mx-1"></div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            title="엑셀 파일 업로드"
                            className={clsx(
                                "p-1.5 rounded transition",
                                uploading ? "text-slate-400 cursor-not-allowed" : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                            )}
                        >
                            <Upload className="w-5 h-5" />
                        </button>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm ml-2"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "저장 중..." : "변경사항 저장"}
                    </button>
                </div>
            </div>

            {/* Selectors */}
            <div className="bg-white p-4 shadow-sm border border-slate-200 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {VEHICLES.map(v => (
                        <button
                            key={v}
                            onClick={() => setSelectedVehicle(v)}
                            className={clsx(
                                "px-4 py-2 text-sm font-medium rounded-full transition-colors flex-1 md:flex-none",
                                selectedVehicle === v
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            )}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                <div className="flex overflow-x-auto pb-2 -mx-2 px-2 sm:pb-0 sm:mx-0 sm:px-0 scrollbar-hide w-full md:w-auto">
                    <div className="flex space-x-1 sm:space-x-2 w-full">
                        {DAYS.map(d => (
                            <button
                                key={d.value}
                                onClick={() => setSelectedDay(d.value)}
                                className={clsx(
                                    "px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors border flex-1 md:flex-none",
                                    selectedDay === d.value
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            {loading ? (
                <div className="p-12 text-center text-slate-500 bg-white rounded-lg border border-slate-200 shadow-sm">데이터를 불러오는 중입니다...</div>
            ) : (
                <div className="space-y-6">
                    {rounds.map((roundIdx) => {
                        const round = roundGroups[roundIdx];
                        return (
                            <div key={roundIdx} className="bg-slate-50 shadow-sm border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-200 text-slate-800 px-4 py-3 flex justify-between items-center border-b border-slate-300">
                                    <h3 className="font-bold text-base flex items-center gap-2">
                                        <span className="bg-slate-800 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">
                                            {roundIdx}
                                        </span>
                                        회차 일정 (Round {roundIdx})
                                    </h3>
                                    <button
                                        onClick={() => removeRound(roundIdx)}
                                        className="text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition"
                                    >
                                        회차 삭제
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                                    <div className="p-4 bg-white/50">
                                        {renderStopInputs("PICKUP", round.pickUps, roundIdx)}
                                    </div>
                                    <div className="p-4 bg-slate-100/50">
                                        {renderStopInputs("DROPOFF", round.dropOffs, roundIdx)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex justify-center pt-4 pb-12">
                        <button
                            onClick={addRound}
                            className="bg-white border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-bold py-3 px-8 rounded-lg shadow-sm flex items-center gap-2 transition"
                        >
                            <Plus className="w-5 h-5" /> 새 회차 (Round) 추가하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
