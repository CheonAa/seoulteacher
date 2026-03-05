'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function KioskPage() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // 스캐너 초기화
        scannerRef.current = new Html5QrcodeScanner(
            'reader',
            { fps: 10, qrbox: { width: 300, height: 300 } },
            false
        );

        const onScanSuccess = async (decodedText: string) => {
            // 연속 스캔 방지
            if (isLoading) return;
            setIsLoading(true);
            setError(null);
            setScanResult(null);

            // 스캐너 잠시 멈춤
            scannerRef.current?.pause(true);

            try {
                const res = await fetch('/api/attendance/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qrToken: decodedText }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || '출석 처리 중 오류가 발생했습니다.');
                } else {
                    setScanResult(data.message);
                }
            } catch (err) {
                setError('네트워크 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
                // 3초 후 다음 스캔을 위해 재개
                setTimeout(() => {
                    setScanResult(null);
                    setError(null);
                    scannerRef.current?.resume();
                }, 3000);
            }
        };

        const onScanFailure = (error: any) => {
            // 프레임 당 스캔 실패 로그 (무시)
        };

        scannerRef.current.render(onScanSuccess, onScanFailure);

        return () => {
            scannerRef.current?.clear().catch(console.error);
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center">
                <div className="bg-blue-600 p-6 text-white">
                    <h1 className="text-3xl font-bold">서울티쳐 출석체크</h1>
                    <p className="mt-2 text-blue-100 text-lg">QR 코드를 스캔해주세요</p>
                </div>

                <div className="p-8">
                    <div id="reader" className="mb-6 border-none rounded-xl overflow-hidden mx-auto" style={{ width: '100%', maxWidth: '350px' }}></div>

                    <div className="min-h-24 flex items-center justify-center">
                        {isLoading && (
                            <div className="flex animate-pulse items-center space-x-2 text-blue-600">
                                <span className="text-xl font-medium">출석 확인 중...</span>
                            </div>
                        )}

                        {!isLoading && scanResult && (
                            <div className={`flex flex-col items-center p-4 rounded-xl space-y-2 w-full animate-in fade-in zoom-in duration-300 ${scanResult.includes('목표 횟수에 도달') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {scanResult.includes('목표 횟수에 도달') ? <AlertCircle className="w-12 h-12 text-red-500" /> : <CheckCircle2 className="w-12 h-12 text-green-500" />}
                                <span className="text-xl font-bold break-words">{scanResult}</span>
                            </div>
                        )}

                        {!isLoading && error && (
                            <div className="flex flex-col items-center p-4 bg-red-50 text-red-700 rounded-xl space-y-2 w-full animate-in fade-in zoom-in duration-300">
                                <AlertCircle className="w-12 h-12 text-red-500" />
                                <span className="text-xl font-bold break-words">{error}</span>
                            </div>
                        )}

                        {!isLoading && !scanResult && !error && (
                            <p className="text-slate-500 font-medium text-lg">카메라에 QR 코드를 비춰주세요</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
