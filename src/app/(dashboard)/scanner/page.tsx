"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Loader2, CheckCircle2, XCircle, QrCode, Phone } from "lucide-react";

export default function QRScannerPage() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [studentData, setStudentData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Mode: "qr" or "phone"
    const [mode, setMode] = useState<"qr" | "phone">("qr");

    // Phone Mode States
    const [phoneInput, setPhoneInput] = useState("");
    const [studentListList, setStudentListList] = useState<any[] | null>(null); // For handling multiple students with same phone suffix
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (mode === "phone") {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
            return;
        }

        // Initialize QR Scanner when in QR mode and no scan result
        if (mode === "qr" && !scanResult && !successMsg && !studentData && !studentListList) {
            scannerRef.current = new Html5QrcodeScanner(
                "qr-reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scannerRef.current.render(onScanSuccess, onScanFailure);

            function onScanSuccess(decodedText: string) {
                if (scanResult !== decodedText) {
                    setScanResult(decodedText);
                    if (scannerRef.current) {
                        scannerRef.current.clear().catch(console.error);
                        scannerRef.current = null;
                    }
                    fetchStudentInfo(decodedText);
                }
            }

            function onScanFailure(error: any) {
                // Ignoring generic scan errors to avoid console spam
            }

            return () => {
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
                }
            };
        }
    }, [mode, scanResult, successMsg, studentData, studentListList]);

    const fetchStudentInfo = async (token: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/attendance/qr?token=${encodeURIComponent(token)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch student");
            setStudentData(data.student);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (enrollmentId: string, studentId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const bodyPayload = mode === "qr"
                ? { token: scanResult, enrollmentId }
                : { studentId: studentId || studentData?.id, enrollmentId }; // Use specific stduentId if passed (from phone list), otherwise fallback

            const apiEndpoint = mode === "qr" ? "/api/attendance/qr" : "/api/attendance/phone";

            const res = await fetch(apiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyPayload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "출석 처리에 실패했습니다.");

            setSuccessMsg(data.message);
            setTimeout(() => {
                resetScanner();
            }, 3000); // 3초 뒤에 초기화
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phoneInput.length !== 4) {
            setError("핸드폰 번호 뒷 4자리를 정확히 입력해주세요.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/attendance/phone?suffix=${encodeURIComponent(phoneInput)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch student");

            if (data.students.length === 1) {
                // Only one student found, show their enrollments step
                setStudentData(data.students[0]);
                setStudentListList(null);
            } else if (data.students.length > 1) {
                // Multiple students found, show selection step
                setStudentListList(data.students);
                setStudentData(null);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePhonePadClick = (digit: string) => {
        if (phoneInput.length < 4) {
            setPhoneInput(prev => prev + digit);
        }
    };

    const handlePhonePadDelete = () => {
        setPhoneInput(prev => prev.slice(0, -1));
    };

    const handleStudentSelectFromPhoneList = (student: any) => {
        setStudentData(student);
        setStudentListList(null);
    };

    const resetScanner = () => {
        setScanResult(null);
        setStudentData(null);
        setStudentListList(null);
        setError(null);
        setSuccessMsg(null);
        setPhoneInput("");
        if (mode === "qr") {
            // Reload page to re-initialize scanner safely (html5-qrcode re-render can be tricky)
            window.location.reload();
        }
    };

    const switchMode = (newMode: "qr" | "phone") => {
        if (newMode !== mode) {
            setMode(newMode);
            setScanResult(null);
            setStudentData(null);
            setStudentListList(null);
            setError(null);
            setSuccessMsg(null);
            setPhoneInput("");
            if (newMode === "qr") {
                window.location.reload(); // Hard reset for camera
            }
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-6 text-center tracking-tight">출결 스캐너</h1>

            {/* Mode Toggle Tabs */}
            {!successMsg && !loading && (
                <div className="flex justify-center mb-8">
                    <div className="bg-slate-100 p-1 rounded-xl inline-flex shadow-inner">
                        <button
                            onClick={() => switchMode("qr")}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${mode === "qr"
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                }`}
                        >
                            <QrCode className="w-5 h-5" />
                            QR 스캔
                        </button>
                        <button
                            onClick={() => switchMode("phone")}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${mode === "phone"
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                }`}
                        >
                            <Phone className="w-5 h-5" />
                            번호 입력
                        </button>
                    </div>
                </div>
            )}

            {/* QR Mode Body */}
            {mode === "qr" && !scanResult && !successMsg && !loading && !error && !studentData && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 mb-8 w-full max-w-md mx-auto aspect-square flex flex-col items-center justify-center">
                    <div id="qr-reader" className="w-full overflow-hidden rounded-xl border-2 border-slate-100 text-slate-900 [&_*]:text-slate-900 [&_a]:text-blue-600 [&_video]:rounded-lg"></div>
                </div>
            )}

            {/* Phone Mode Body */}
            {mode === "phone" && !studentListList && !studentData && !successMsg && !loading && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 w-full max-w-md mx-auto animate-in slide-in-from-bottom-4">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900">핸드폰 번호 뒷 4자리 입력</h2>
                        <p className="text-slate-500 mt-2 text-sm">입력 후 조회를 눌러주세요.</p>
                    </div>

                    <form onSubmit={handlePhoneSearch}>
                        <div className="mb-8">
                            <input
                                type="text"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                                className="w-full text-center text-slate-900 text-4xl font-mono tracking-[0.5em] py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                placeholder="0000"
                                maxLength={4}
                                readOnly // User uses the custom keypad
                            />
                        </div>

                        {/* Custom Keypad for tablet usability */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => handlePhonePadClick(num.toString())}
                                    className="py-4 text-2xl font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200 transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={resetScanner}
                                className="py-4 text-sm font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                초기화
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePhonePadClick("0")}
                                className="py-4 text-2xl font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200 transition-colors"
                            >
                                0
                            </button>
                            <button
                                type="button"
                                onClick={handlePhonePadDelete}
                                className="py-4 text-sm font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                            >
                                지우기
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={phoneInput.length !== 4}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            학생 조회
                        </button>
                    </form>
                </div>
            )}

            {/* Multiple Students Selection (Phone Mode) */}
            {studentListList && !successMsg && !loading && (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-50 border-b border-slate-100 p-6 text-center">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 border-b-4 border-blue-600 inline-block pb-1">본인을 선택해주세요</h2>
                        <p className="text-slate-500 mt-4 text-sm font-medium">동일한 번호를 사용하는 학생이 여러 명 있습니다.</p>
                    </div>
                    <div className="p-4 bg-slate-100/50 space-y-3">
                        {studentListList.map((stu: any) => (
                            <button
                                key={stu.id}
                                onClick={() => handleStudentSelectFromPhoneList(stu)}
                                className="w-full text-left bg-white p-5 rounded-xl border-2 border-transparent shadow-sm hover:border-blue-500 hover:shadow-md transition-all group flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-700 transition-colors">
                                        {stu.name} 학생
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {stu.school && `${stu.school} `}{stu.grade && `${stu.grade}학년 `} (수강 과목 {stu.enrollments.length}개)
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors shrink-0">
                                    <CheckCircle2 className="w-6 h-6 text-slate-300 group-hover:text-blue-600 transition-colors" />
                                </div>
                            </button>
                        ))}
                        <button
                            onClick={resetScanner}
                            className="mt-6 w-full py-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors shadow-sm"
                        >
                            취소 (처음으로)
                        </button>
                    </div>
                </div>
            )}

            {/* Shared UI States below */}

            {loading && (
                <div className="flex flex-col items-center justify-center space-y-4 py-12">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-slate-500 font-medium">정보를 처리하는 중...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 p-6 rounded-xl border border-red-200 max-w-md mx-auto text-center space-y-4">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <p className="text-red-600 font-medium text-lg text-balance">{error}</p>
                    <button
                        onClick={resetScanner}
                        className="w-full py-3 mt-4 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl transition-colors shadow-sm"
                    >
                        다시 스캔하기
                    </button>
                </div>
            )}

            {successMsg && (
                <div className="bg-green-50 p-8 rounded-2xl border border-green-200 max-w-md mx-auto text-center space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <p className="text-green-800 font-bold tracking-tight text-xl leading-snug text-balance">{successMsg}</p>
                    <p className="text-sm font-medium text-green-600 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        잠시 후 스캐너 화면으로 돌아갑니다...
                    </p>
                </div>
            )}

            {studentData && !error && !successMsg && !loading && (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-50 border-b border-slate-100 p-6 text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 border-b-4 border-blue-600 inline-block pb-1">{studentData.name} 학생</h2>
                        <p className="text-slate-500 mt-4 font-medium">출석을 기록할 수강 과목을 선택해주세요.</p>
                    </div>
                    <div className="p-4 bg-slate-100/50">
                        <div className="space-y-3">
                            {studentData.enrollments.map((enr: any) => (
                                <button
                                    key={enr.id}
                                    onClick={() => handleCheckIn(enr.id, studentData.id)}
                                    className="w-full text-left bg-white p-5 rounded-xl border-2 border-transparent shadow-sm hover:border-blue-500 hover:shadow-md transition-all group flex items-center justify-between"
                                >
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-700 transition-colors">
                                            {enr.subjectName}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                            담당 강사: {enr.instructor.name}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors shrink-0">
                                        <CheckCircle2 className="w-6 h-6 text-slate-300 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={resetScanner}
                            className="mt-6 w-full py-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors shadow-sm"
                        >
                            취소 (다시 스캔)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
