"use client";

import { useState, useEffect } from "react";
import { Search, QrCode, X } from "lucide-react";
import QRCode from "qrcode";

type StudentData = {
    id: string;
    name: string;
    gender: string | null;
    school: string | null;
    grade: string | null;
    phone: string | null;
    qrToken: string;
    enrollments: {
        id: string;
        subjectName: string;
        instructor: { name: string };
        feePerSession: number;
        targetSessionsMonth: number;
        depositorName?: string | null;
    }[];
};

export default function StudentTable({ initialStudents }: { initialStudents: StudentData[] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedQrStudent, setSelectedQrStudent] = useState<StudentData | null>(null);
    const [qrImageUrl, setQrImageUrl] = useState<string>("");

    useEffect(() => {
        if (selectedQrStudent) {
            QRCode.toDataURL(selectedQrStudent.qrToken, { width: 300, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
                .then(url => setQrImageUrl(url))
                .catch(err => console.error(err));
        } else {
            setQrImageUrl("");
        }
    }, [selectedQrStudent]);

    const filteredStudents = initialStudents.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.school && student.school.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex flex-col w-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="이름 또는 학교 이름으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">이름</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">학교 / 학년</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">성별</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">연락처</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">수강 과목 (담당 강사)</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">QR</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    {searchTerm ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{student.name}</div>
                                        <div className="text-xs text-slate-400 mt-1 font-mono" title="QR Token Prefix">{student.qrToken.split('-')[0]}***</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900">{student.school || '-'}</div>
                                        <div className="text-xs text-slate-500">{student.grade ? `${student.grade}학년` : ''}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.gender === 'M' ? 'bg-blue-100 text-blue-800' : student.gender === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-slate-100 text-slate-800'}`}>
                                            {student.gender || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <div className="text-sm text-slate-900">{student.phone || "-"}</div>
                                        {student.enrollments && student.enrollments.map(e => e.depositorName).filter(Boolean).length > 0 && (
                                            <div className="text-xs text-blue-600 mt-1">
                                                입금자: {Array.from(new Set(student.enrollments.map(e => e.depositorName).filter(Boolean))).join(', ')}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {student.enrollments.length === 0 ? (
                                            <span className="text-slate-400 text-xs">수강 내역 없음</span>
                                        ) : (
                                            <div className="flex flex-col gap-1.5">
                                                {student.enrollments.map((env) => (
                                                    <span key={env.id} className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 w-fit">
                                                        <span className="font-medium text-slate-700">{env.subjectName}</span>
                                                        <span className="text-xs text-slate-500 border-l border-slate-300 pl-1 ml-1">{env.instructor.name}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button
                                            onClick={() => setSelectedQrStudent(student)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors inline-block focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            title="출결 QR 코드 보기"
                                        >
                                            <QrCode className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* QR Modal */}
            {selectedQrStudent && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-slate-900 text-lg">
                                {selectedQrStudent.name} 학생
                            </h3>
                            <button
                                onClick={() => setSelectedQrStudent(null)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col items-center justify-center space-y-4">
                            {qrImageUrl ? (
                                <div className="bg-white p-2 text-center flex flex-col items-center">
                                    <img src={qrImageUrl} alt="QR Code" className="w-48 h-48 object-contain" />
                                </div>
                            ) : (
                                <div className="w-48 h-48 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                                    QR 로딩 중...
                                </div>
                            )}
                            <p className="text-sm font-medium text-slate-700 mt-2">출결 QR 코드</p>
                            <p className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 text-center break-all w-full select-all">
                                {selectedQrStudent.qrToken}
                            </p>
                        </div>
                        <div className="bg-blue-50/50 px-6 py-4 border-t border-blue-100/50">
                            <div className="text-xs text-blue-800 space-y-1.5">
                                <div className="font-medium flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                    안내사항
                                </div>
                                <p className="pl-3 text-blue-600/90 leading-relaxed text-balance">
                                    태블릿의 QR 스캐너를 통해 이 코드를 스캔하면 해당 학생의 출석이 기록됩니다. 학생에게 화면을 캡처하여 전달해주세요.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
