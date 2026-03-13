"use client";

import { useState, useEffect } from "react";
import { Search, QrCode, X, Edit2, Trash2, AlertTriangle, User } from "lucide-react";
import QRCode from "qrcode";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, Download } from "lucide-react";
import * as xlsx from "xlsx";

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
    creatorId: string | null;
};

export default function StudentTable({ initialStudents, instructors, currentUserId, currentUserRole }: { initialStudents: StudentData[], instructors: { id: string, name: string }[], currentUserId: string, currentUserRole: string }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedQrStudent, setSelectedQrStudent] = useState<StudentData | null>(null);
    const [qrImageUrl, setQrImageUrl] = useState<string>("");

    // Delete state
    const [studentToDelete, setStudentToDelete] = useState<StudentData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Excel upload state
    const [isUploading, setIsUploading] = useState(false);

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

    const handleDelete = async () => {
        if (!studentToDelete) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/students/${studentToDelete.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "삭제에 실패했습니다.");
            }

            setStudentToDelete(null);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("삭제 중 오류가 발생했습니다.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                "학생명": "홍길동",
                "학교": "서울초등학교",
                "학년": "3",
                "성별(M/F)": "M",
                "학생연락처": "010-1234-5678",
                "수강과목": "수학",
                "담당강사명": instructors.length > 0 ? instructors[0].name : "김교사",
                "1회수강료": 50000,
                "월목표횟수": 8,
                "입금자명": "홍아빠"
            },
            {
                "학생명": "홍길동",
                "학교": "서울초등학교",
                "학년": "3",
                "성별(M/F)": "M",
                "학생연락처": "010-1234-5678",
                "수강과목": "영어",
                "담당강사명": instructors.length > 1 ? instructors[1].name : "이교사",
                "1회수강료": 45000,
                "월목표횟수": 8,
                "입금자명": "홍아빠"
            }
        ];

        const worksheet = xlsx.utils.json_to_sheet(templateData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "학생등록양식");
        
        // Add note explaining how to add multiple subjects
        xlsx.utils.sheet_add_aoa(worksheet, [["* 같은 학생이 여러 과목을 수강할 경우, 위 '홍길동' 예시처럼 학생 정보를 동일하게 적고 수강과목/강사 정보만 다르게 하여 여러 줄로 작성하세요."]], { origin: "A5" });

        const wscols = [
            { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 10 }, { wch: 15 },
            { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }
        ];
        worksheet['!cols'] = wscols;

        xlsx.writeFile(workbook, "신규학생_일괄등록_양식.xlsx");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const workbook = xlsx.read(bstr, { type: "binary" });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data = xlsx.utils.sheet_to_json<any>(sheet);

                    // Group by exact student name (and phone if helpful)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const studentMap = new Map<string, any>();

                    for (const row of data) {
                        const name = row["학생명"];
                        if (!name) continue; // skip notes or empty rows

                        // Find instructor
                        const instructorName = row["담당강사명"];
                        const inst = instructors.find(i => i.name.trim() === instructorName?.trim());
                        if (!inst) {
                            alert(`'${name}' 학생의 담당강사 '${instructorName}'를 찾을 수 없습니다. 등록된 강사명과 정확히 일치해야 합니다.`);
                            return;
                        }

                        const enrollment = {
                            instructorId: inst.id,
                            subjectName: row["수강과목"],
                            feePerSession: Number(row["1회수강료"]) || 0,
                            targetSessionsMonth: Number(row["월목표횟수"]) || 0,
                            depositorName: row["입금자명"] || "",
                        };

                        if (studentMap.has(name)) {
                            studentMap.get(name).enrollments.push(enrollment);
                        } else {
                            studentMap.set(name, {
                                name: name,
                                school: row["학교"] || "",
                                grade: row["학년"] ? String(row["학년"]) : "",
                                gender: row["성별(M/F)"] === "M" || row["성별(M/F)"] === "F" ? row["성별(M/F)"] : null,
                                phone: row["학생연락처"] || "",
                                enrollments: [enrollment]
                            });
                        }
                    }

                    const payload = Array.from(studentMap.values());
                    
                    if (payload.length === 0) {
                        alert("업로드할 유효한 학생 데이터가 없습니다.");
                        return;
                    }

                    const res = await fetch("/api/admin/students/bulk", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ students: payload })
                    });

                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.error || "일괄 등록에 실패했습니다.");
                    }

                    alert(`${payload.length}명의 학생이 성공적으로 일괄 등록되었습니다.`);
                    router.refresh();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (err: any) {
                    alert("파일 처리 중 오류: " + err.message);
                } finally {
                    setIsUploading(false);
                    e.target.value = ""; // reset input
                }
            };
            reader.readAsBinaryString(file);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            alert("파일 읽기 오류: " + err.message);
            setIsUploading(false);
            e.target.value = "";
        }
    };

    return (
        <div className="flex flex-col w-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative max-w-sm w-full">
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
                
                {(currentUserRole === 'ADMIN' || currentUserRole === 'OWNER') && (
                    <div className="flex items-center gap-2 bg-white rounded-md p-1 border border-slate-200">
                        <button
                            onClick={handleDownloadTemplate}
                            title="엑셀 양식 다운로드"
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition flex items-center gap-1.5 text-sm font-medium px-3"
                        >
                            <Download className="w-4 h-4" /> 양식 다운로드
                        </button>
                        <div className="w-[1px] h-6 bg-slate-300 mx-1"></div>
                        <label
                            title="엑셀 파일 업로드"
                            className={`p-1.5 rounded transition flex items-center gap-1.5 text-sm font-medium px-3 cursor-pointer ${isUploading ? "text-slate-400 cursor-not-allowed" : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"}`}
                        >
                            <Upload className="w-4 h-4" /> 일괄 등록
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                disabled={isUploading}
                                onChange={handleFileUpload}
                            />
                        </label>
                    </div>
                )}
            </div>

            {/* 데스크탑(PC & 태블릿) 전용 테이블 뷰 */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">이름</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">학교 / 학년</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">성별</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">연락처</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">수강 과목 (담당 강사)</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">QR & 관리</th>
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
                                        <Link href={`/admin/students/${student.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors block">
                                            {student.name}
                                        </Link>
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
                                        <div className="flex items-center justify-center space-x-2">
                                            <Link
                                                href={`/admin/students/${student.id}`}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                title="상세 보기"
                                            >
                                                <User className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => setSelectedQrStudent(student)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                title="출결 QR 코드 보기"
                                            >
                                                <QrCode className="w-4 h-4" />
                                            </button>
                                            {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' || student.creatorId === currentUserId || student.enrollments.some(e => instructors.find(i => i.id === currentUserId)?.name === e.instructor.name)) && (
                                                <Link
                                                    href={`/admin/students/${student.id}/edit`}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    title="수정"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Link>
                                            )}
                                            {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
                                                <button
                                                    onClick={() => setStudentToDelete(student)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 모바일 전용 카드 뷰 */}
            <div className="block md:hidden border-t border-slate-100 bg-slate-50/30">
                {filteredStudents.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                        {searchTerm ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-slate-100">
                        {filteredStudents.map((student) => (
                            <div key={student.id} className="p-4 bg-white hover:bg-slate-50 transition-colors flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 pr-2">
                                        <Link href={`/admin/students/${student.id}`} className="text-base font-bold text-blue-600 hover:text-blue-800 hover:underline">
                                            {student.name}
                                        </Link>
                                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono" title="QR Token Prefix">
                                            {student.qrToken.split('-')[0]}***
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-100 rounded-lg p-1 shadow-sm">
                                        <Link
                                            href={`/admin/students/${student.id}`}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition-colors"
                                            title="상세 보기"
                                        >
                                            <User className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={() => setSelectedQrStudent(student)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition-colors"
                                            title="출결 QR 코드 보기"
                                        >
                                            <QrCode className="w-4 h-4" />
                                        </button>
                                        {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' || student.creatorId === currentUserId || student.enrollments.some(e => instructors.find(i => i.id === currentUserId)?.name === e.instructor.name)) && (
                                            <Link
                                                href={`/admin/students/${student.id}/edit`}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md transition-colors"
                                                title="수정"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Link>
                                        )}
                                        {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
                                            <button
                                                onClick={() => setStudentToDelete(student)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mt-1">
                                    {student.school && <span className="font-medium text-slate-800">{student.school} <span className="font-normal text-slate-500">{student.grade ? `${student.grade}학년` : ''}</span></span>}
                                    {student.gender && (
                                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${student.gender === 'M' ? 'bg-blue-100 text-blue-800' : student.gender === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-slate-100 text-slate-800'}`}>
                                            {student.gender}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5 text-sm text-slate-600">
                                    {student.phone ? (
                                        <a href={`tel:${student.phone}`} className="inline-flex items-center gap-1.5 text-blue-600 bg-blue-50/50 hover:bg-blue-100 px-2 py-1.5 rounded-md transition-colors w-fit border border-blue-100">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            {student.phone}
                                        </a>
                                    ) : (
                                        <span className="text-slate-400 text-xs px-1">등록된 연락처 없음</span>
                                    )}
                                    {student.enrollments && student.enrollments.map(e => e.depositorName).filter(Boolean).length > 0 && (
                                        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1.5 rounded-md w-fit">
                                            입금자명: <span className="text-slate-700 font-medium">{Array.from(new Set(student.enrollments.map(e => e.depositorName).filter(Boolean))).join(', ')}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-100 mt-1">
                                    {student.enrollments.length === 0 ? (
                                        <span className="text-slate-400 text-[11px] text-center block w-full bg-slate-50 py-2.5 rounded-md border border-dashed border-slate-200">수강 중인 과목이 없습니다.</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {student.enrollments.map((env) => (
                                                <span key={env.id} className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                                                    <span className="font-semibold text-slate-800 text-sm">{env.subjectName}</span>
                                                    <span className="text-[11px] text-slate-500 border-l border-slate-300 pl-1.5">{env.instructor.name} 강사</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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

            {/* Delete Confirmation Modal */}
            {studentToDelete && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-6 mx-auto">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">학생 데이터 삭제</h3>
                                <p className="text-sm text-slate-500 text-balance">
                                    <span className="font-semibold text-slate-900">{studentToDelete.name}</span> 학생의 정보를 완전히 삭제하시겠습니까?<br />
                                    <span className="text-red-600 font-medium">주의: 등록된 학부모, 수강 내역, 출결 및 급여 관련 연결 데이터가 모두 영구적으로 삭제됩니다. </span>
                                    이 작업은 되돌릴 수 없습니다.
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end sm:space-x-3 gap-3 sm:gap-0">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setStudentToDelete(null)}
                                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDelete}
                                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                            >
                                {isDeleting ? "삭제 중..." : "위험성 확인 및 삭제"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
