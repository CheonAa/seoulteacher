"use client";

import { useState, useRef } from 'react';
import * as xlsx from 'xlsx';
import { Upload, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ExcelStudentUploader() {
    const [matches, setMatches] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = xlsx.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonData: any[] = xlsx.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                throw new Error("엑셀 파일에 데이터가 없습니다.");
            }

            // Group rows by student name + phone number
            const groupedStudents = new Map<string, any>();

            jsonData.forEach((row, index) => {
                const rowNum = index + 2; // +1 for 0-index, +1 for header

                // --- 1. Validate Core Student Info ---
                const stName = String(row['이름(한글)'] || '').trim();
                const stEnglishName = String(row['이름(영문)'] || '').trim();
                const stPhone = String(row['학생연락처'] || '').trim();
                
                if (!stName) throw new Error(`${rowNum}행: '이름(한글)'이 누락되었습니다.`);

                // Unique Key for grouping: Name + Phone
                const stKey = `${stName}-${stPhone}`;

                if (!groupedStudents.has(stKey)) {
                    groupedStudents.set(stKey, {
                        name: stName,
                        englishName: stEnglishName,
                        gender: String(row['성별'] || 'M').trim().toUpperCase(),
                        school: String(row['학교'] || '').trim(),
                        grade: String(row['학년'] || '').trim(),
                        phone: stPhone,
                        shuttleStatus: String(row['차량탑승여부'] || '').trim() === 'O' ? 'BOARDING' : 'NOT_BOARDING',
                        shuttleLocation: String(row['차량탑승지'] || '').trim(),
                        parents: [],
                        enrollments: []
                    });
                }
                const studentData = groupedStudents.get(stKey);

                // --- 2. Add Parent Info (Avoid duplicates) ---
                const pName = String(row['학부모이름(한글)'] || '').trim();
                const pEnglishName = String(row['학부모이름(영문)'] || '').trim();
                const pPhone = String(row['학부모연락처'] || '').trim();
                const pRelation = String(row['관계'] || 'Mother').trim();

                if (pName) {
                    const isDuplicateParent = studentData.parents.some((p: any) => p.name === pName && p.phone === pPhone);
                    if (!isDuplicateParent) {
                        studentData.parents.push({
                            name: pName,
                            englishName: pEnglishName,
                            phone: pPhone,
                            relation: pRelation
                        });
                    }
                }

                // --- 3. Add Enrollment Info ---
                const cur = String(row['교육과정'] || '한국').trim() === '해외' ? 'INTERNATIONAL' : 'KOREAN';
                const period = String(row['기간'] || '학기').trim() === '방학' ? 'VACATION' : 'SEMESTER';
                
                let gradeGroup = 'ELEM';
                const rawGrade = String(row['수강학년'] || '초등').trim();
                if (cur === 'KOREAN') {
                    if (rawGrade.includes('중등')) gradeGroup = 'MID';
                    else if (rawGrade.includes('고등')) gradeGroup = 'HIGH';
                } else {
                    if (rawGrade.includes('10')) gradeGroup = 'G10_12';
                    else gradeGroup = 'G7_9';
                }

                const feePerSessionStr = String(row['1회차 수강료'] || '');
                const feePerSession = feePerSessionStr ? Number(feePerSessionStr.replace(/,/g, '')) : null;

                studentData.enrollments.push({
                    instructorEmail: String(row['담당강사이메일'] || '').trim(),
                    subjectName: String(row['수강과목명'] || '').trim(),
                    curriculum: cur,
                    period: period,
                    gradeGroup: gradeGroup,
                    targetSessionsMonth: Number(row['목표회차'] || 8),
                    startDate: row['시작일자'] ? new Date(row['시작일자']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    depositorName: String(row['입금자명'] || '').trim(),
                    accountNumber: String(row['입금계좌번호'] || '').trim(),
                    // Pass parsed fee, or null to auto-calculate on backend
                    feePerSession: feePerSession, 
                });
            });

            // Convert Map to JSON array
            const finalPayload = Array.from(groupedStudents.values());
            setMatches(finalPayload);
            setShowModal(true);
        } catch (error: any) {
            console.error("Excel parse error", error);
            setErrorMsg(error.message || "엑셀 파일 처리 중 오류가 발생했습니다. 양식을 확인해주세요.");
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const confirmMatches = async () => {
        if (matches.length === 0) return;
        setIsProcessing(true);
        setErrorMsg(null);

        try {
            // Call bulk create API
            const res = await fetch('/api/admin/students/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(matches)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "일괄 등록 서버 에러");

            alert(`총 ${matches.length}명의 학생과 수강 내역이 성공적으로 등록되었습니다.`);
            setShowModal(false);
            router.refresh();
        } catch (error: any) {
            setErrorMsg(error.message || "저장 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadTemplate = () => {
        // Create dummy worksheet matching the columns we expect
        const ws = xlsx.utils.json_to_sheet([
            {
                '이름(한글)': '홍길동',
                '이름(영문)': 'Hong Gildong',
                '성별': 'M',
                '학교': 'UNIS',
                '학년': 'G10',
                '학생연락처': '010-1234-1111',
                '차량탑승여부': 'X',
                '차량탑승지': '',
                '학부모이름(한글)': '홍아빠',
                '학부모이름(영문)': 'Hong Papa',
                '학부모연락처': '010-1234-9999',
                '관계': 'Father',
                '담당강사이메일': 'teacher1@example.com',
                '수강과목명': '인터수학',
                '교육과정': '해외',
                '기간': '학기',
                '수강학년': 'G10-12',
                '목표회차': 8,
                '시작일자': '2024-03-01',
                '입금자명': '홍아빠,홍엄마',
                '입금계좌번호': '7000123123',
                '1회차 수강료': '' // 비워두면 자동 계산됨
            },
            {
                '이름(한글)': '홍길동',
                '이름(영문)': 'Hong Gildong',
                '성별': 'M',
                '학교': 'UNIS',
                '학년': 'G10',
                '학생연락처': '010-1234-1111',
                '차량탑승여부': 'X',
                '차량탑승지': '',
                '학부모이름(한글)': '김엄마',
                '학부모이름(영문)': 'Kim Mom',
                '학부모연락처': '010-1234-8888',
                '관계': 'Mother',
                '담당강사이메일': 'teacher2@example.com',
                '수강과목명': '기초영어',
                '교육과정': '한국',
                '기간': '방학',
                '수강학년': '초등',
                '목표회차': 12,
                '시작일자': '2024-03-10',
                '입금자명': '김엄마',
                '입금계좌번호': '',
                '1회차 수강료': '' // 비워두면 자동 계산됨
            }
        ]);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "학생일괄업로드");
        xlsx.writeFile(wb, "학생_수강_일괄등로_양식.xlsx");
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 border border-blue-200 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    <Upload className="w-4 h-4 mr-2" />
                    {isProcessing ? '처리중...' : '일괄 등록 업로드 (엑셀)'}
                </button>
                <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 relative group"
                >
                    <FileSpreadsheet className="w-4 h-4 mr-1 text-emerald-600" />
                    양식 다운로드
                </button>
            </div>

            {errorMsg && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200 flex items-start">
                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    {errorMsg}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <CheckCircle className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            학생 및 수강 일괄 등록 미리보기
                                        </h3>
                                        <div className="mt-4 max-h-96 overflow-y-auto pr-2">
                                            <div className="bg-slate-50 p-3 rounded-md mb-4 border border-slate-200 text-sm">
                                                총 <strong>{matches.length}</strong>명의 독립된 학생과 전체 <strong>{matches.reduce((acc, match) => acc + match.enrollments.length, 0)}</strong>건의 수강 신청 건이 감지되었습니다.
                                            </div>
                                            <ul className="divide-y divide-gray-200">
                                                {matches.map((student, i) => (
                                                    <li key={i} className="py-4">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <p className="text-sm font-bold text-gray-900 border-l-4 border-blue-500 pl-2">
                                                                {student.name} <span className="font-normal text-slate-500">({student.school || '학교미상'}, {student.phone || '연락처없음'})</span>
                                                            </p>
                                                        </div>
                                                        <div className="pl-3 mt-1 text-xs text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            <div>
                                                                <strong className="text-slate-800">등록 학부모:</strong> {student.parents.length}명
                                                            </div>
                                                            <div>
                                                                <strong className="text-slate-800">차량 탑승:</strong> {student.shuttleStatus === 'BOARDING' ? `O (${student.shuttleLocation})` : 'X'}
                                                            </div>
                                                        </div>
                                                        <div className="pl-3 mt-2">
                                                            <strong className="text-xs text-blue-700">수강 목록 ({student.enrollments.length}):</strong>
                                                            <ul className="list-disc list-inside text-xs text-gray-600 ml-1 mt-1 space-y-1">
                                                                {student.enrollments.map((enr: any, eIdx: number) => (
                                                                    <li key={eIdx}>
                                                                        <span className="font-semibold">{enr.subjectName}</span> 
                                                                        ({enr.period === 'SEMESTER' ? '학기' : '방학'}, {enr.targetSessionsMonth}회) - 강사이메일: {enr.instructorEmail || '누락됨!!'}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={confirmMatches}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    {isProcessing ? '처리중...' : '일괄 등록 저장'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
