'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
    Search,
    CheckCircle2,
    AlertCircle,
    Plus,
    Edit2,
    Trash2,
    Download,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

export interface DepositRecordItem {
    id: string;
    depositDate: string; // ISO string (UTC midnight)
    amount: number;
    description: string;
    matchedStudentName: string | null;
    studentId: string | null;
    instructorId: string | null;
    reconciliationStatus: string;
    instructor: { id: string; name: string } | null;
    student: { id: string; name: string } | null;
}

interface Props {
    initialDeposits: DepositRecordItem[];
    instructors: { id: string; name: string }[];
    students: { id: string; name: string }[];
    role: string;
}

function toUtcDateStr(isoStr: string): string {
    if (!isoStr) return '';
    return new Date(isoStr).toISOString().slice(0, 10);
}

function toUtcYearMonth(isoStr: string): string {
    if (!isoStr) return '';
    return new Date(isoStr).toISOString().slice(0, 7);
}

export default function DepositReconciliationTable({
    initialDeposits,
    instructors,
    students,
    role
}: Props) {
    const router = useRouter();
    const canManage = role === 'OWNER' || role === 'ADMIN';

    const [deposits, setDeposits] = useState<DepositRecordItem[]>(initialDeposits);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
    const [selectedInstructor, setSelectedInstructor] = useState<string>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [pageSize, setPageSize] = useState<number>(50);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Modal state for Add / Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DepositRecordItem | null>(null);
    const [formDate, setFormDate] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formStudentId, setFormStudentId] = useState('');
    const [formMatchedStudentName, setFormMatchedStudentName] = useState('');
    const [formInstructorId, setFormInstructorId] = useState('');
    const [formStatus, setFormStatus] = useState('입금확인');
    const [isSaving, setIsSaving] = useState(false);

    // Available year-months sorted descending
    const availableMonths = useMemo(() => {
        const set = new Set<string>();
        deposits.forEach((d) => {
            const ym = toUtcYearMonth(d.depositDate);
            if (ym) set.add(ym);
        });
        return Array.from(set).sort((a, b) => b.localeCompare(a));
    }, [deposits]);

    // Filtered deposits
    const filteredDeposits = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return deposits.filter((item) => {
            if (selectedMonth !== 'ALL' && toUtcYearMonth(item.depositDate) !== selectedMonth) {
                return false;
            }
            if (selectedInstructor === 'UNASSIGNED') {
                if (item.instructorId !== null) return false;
            } else if (selectedInstructor !== 'ALL') {
                if (item.instructorId !== selectedInstructor) return false;
            }
            if (selectedStatus !== 'ALL' && item.reconciliationStatus !== selectedStatus) {
                return false;
            }
            if (q) {
                const descMatch = item.description.toLowerCase().includes(q);
                const studentMatch = (item.matchedStudentName || item.student?.name || '').toLowerCase().includes(q);
                const instMatch = (item.instructor?.name || '').toLowerCase().includes(q);
                if (!descMatch && !studentMatch && !instMatch) return false;
            }
            return true;
        });
    }, [deposits, selectedMonth, selectedInstructor, selectedStatus, searchTerm]);

    // Summary stats for filtered records
    const summary = useMemo(() => {
        let confirmedCount = 0;
        let confirmedAmount = 0;
        let unconfirmedCount = 0;
        let unconfirmedAmount = 0;

        filteredDeposits.forEach((d) => {
            if (d.reconciliationStatus === '입금확인') {
                confirmedCount += 1;
                confirmedAmount += d.amount;
            } else {
                unconfirmedCount += 1;
                unconfirmedAmount += d.amount;
            }
        });

        return {
            totalCount: filteredDeposits.length,
            totalAmount: confirmedAmount + unconfirmedAmount,
            confirmedCount,
            confirmedAmount,
            unconfirmedCount,
            unconfirmedAmount
        };
    }, [filteredDeposits]);

    // Pagination
    const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredDeposits.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedDeposits = useMemo(() => {
        if (pageSize === 0) return filteredDeposits;
        const start = (safePage - 1) * pageSize;
        return filteredDeposits.slice(start, start + pageSize);
    }, [filteredDeposits, pageSize, safePage]);

    const openCreateModal = () => {
        setEditingItem(null);
        setFormDate(new Date().toISOString().slice(0, 10));
        setFormAmount('');
        setFormDescription('');
        setFormStudentId('');
        setFormMatchedStudentName('');
        setFormInstructorId('');
        setFormStatus('입금확인');
        setIsModalOpen(true);
    };

    const openEditModal = (item: DepositRecordItem) => {
        setEditingItem(item);
        setFormDate(toUtcDateStr(item.depositDate));
        setFormAmount(String(item.amount));
        setFormDescription(item.description);
        setFormStudentId(item.studentId || '');
        setFormMatchedStudentName(item.matchedStudentName || item.student?.name || '');
        setFormInstructorId(item.instructorId || '');
        setFormStatus(item.reconciliationStatus || '입금확인');
        setIsModalOpen(true);
    };

    const handleStudentSelectChange = (newStudentId: string) => {
        setFormStudentId(newStudentId);
        if (newStudentId) {
            const found = students.find((s) => s.id === newStudentId);
            if (found && (!formMatchedStudentName || editingItem?.studentId === formStudentId || !editingItem?.matchedStudentName)) {
                setFormMatchedStudentName(found.name);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = Number(String(formAmount).replace(/,/g, '').trim());
        if (!formDate || Number.isNaN(numericAmount)) {
            alert('입금일자와 입금액을 올바르게 입력해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                depositDate: `${formDate}T00:00:00.000Z`,
                amount: numericAmount,
                description: formDescription.trim(),
                studentId: formStudentId || null,
                matchedStudentName: formMatchedStudentName.trim() || null,
                instructorId: formInstructorId || null,
                reconciliationStatus: formStatus
            };

            if (editingItem) {
                const res = await fetch(`/api/admin/deposits/${editingItem.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || '수정에 실패했습니다.');

                const updatedItem: DepositRecordItem = {
                    ...data.deposit,
                    depositDate: new Date(data.deposit.depositDate).toISOString()
                };
                setDeposits((prev) => prev.map((d) => (d.id === editingItem.id ? updatedItem : d)));
            } else {
                const res = await fetch('/api/admin/deposits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || '등록에 실패했습니다.');

                const createdItem: DepositRecordItem = {
                    ...data.deposit,
                    depositDate: new Date(data.deposit.depositDate).toISOString()
                };
                setDeposits((prev) =>
                    [createdItem, ...prev].sort((a, b) => b.depositDate.localeCompare(a.depositDate))
                );
            }

            setIsModalOpen(false);
            router.refresh();
        } catch (err: any) {
            alert(err.message || '저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (item: DepositRecordItem) => {
        if (!confirm(`${toUtcDateStr(item.depositDate)} / ${item.amount.toLocaleString()}₫ 입금 내역을 삭제하시겠습니까?`)) {
            return;
        }
        try {
            const res = await fetch(`/api/admin/deposits/${item.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '삭제에 실패했습니다.');

            setDeposits((prev) => prev.filter((d) => d.id !== item.id));
            router.refresh();
        } catch (err: any) {
            alert(err.message || '삭제 중 오류가 발생했습니다.');
        }
    };

    const handleExcelExport = () => {
        if (filteredDeposits.length === 0) {
            alert('다운로드할 내역이 없습니다.');
            return;
        }

        const rows = filteredDeposits.map((d) => ({
            '입금일자': toUtcDateStr(d.depositDate),
            '입금액': d.amount,
            '통장 적요 / 입금자명': d.description,
            '매칭 수강생': d.matchedStudentName || d.student?.name || '-',
            '담당 강사': d.instructor?.name || '-',
            '대사 결과': d.reconciliationStatus
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '입금대사목록');
        XLSX.writeFile(wb, `SeoulTeacher_입금대사목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="space-y-4 p-4 sm:p-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="text-xs font-medium text-slate-500">조회 건수</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">
                        {summary.totalCount.toLocaleString()}건
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                        총액 {summary.totalAmount.toLocaleString()}₫
                    </div>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4">
                    <div className="text-xs font-medium text-emerald-700">입금확인 합계</div>
                    <div className="mt-1 text-xl font-bold text-emerald-800">
                        {summary.confirmedAmount.toLocaleString()}₫
                    </div>
                    <div className="mt-1 text-xs text-emerald-600">
                        {summary.confirmedCount.toLocaleString()}건 확인됨
                    </div>
                </div>
                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4">
                    <div className="text-xs font-medium text-amber-700">미확인 내역</div>
                    <div className="mt-1 text-xl font-bold text-amber-800">
                        {summary.unconfirmedAmount.toLocaleString()}₫
                    </div>
                    <div className="mt-1 text-xs text-amber-600">
                        {summary.unconfirmedCount.toLocaleString()}건 미확인
                    </div>
                </div>
                <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 flex flex-col justify-between">
                    <div className="text-xs font-medium text-blue-700">데이터 관리</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleExcelExport}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            엑셀 다운로드
                        </button>
                        {canManage && (
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                입금 내역 추가
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedMonth}
                        onChange={(e) => {
                            setSelectedMonth(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="ALL">전체 기간</option>
                        {availableMonths.map((ym) => (
                            <option key={ym} value={ym}>
                                {ym.replace('-', '년 ')}월
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedInstructor}
                        onChange={(e) => {
                            setSelectedInstructor(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="ALL">전체 담당 강사</option>
                        {instructors.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                                {inst.name}
                            </option>
                        ))}
                        <option value="UNASSIGNED">미지정 (-)</option>
                    </select>

                    <select
                        value={selectedStatus}
                        onChange={(e) => {
                            setSelectedStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="ALL">전체 대사 결과</option>
                        <option value="입금확인">입금확인</option>
                        <option value="미확인">미확인</option>
                    </select>

                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value={50}>50건씩 보기</option>
                        <option value={100}>100건씩 보기</option>
                        <option value={0}>전체 보기</option>
                    </select>
                </div>

                <div className="relative w-full lg:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="수강생, 통장 적요 / 입금자명 검색..."
                        className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white text-black placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                입금일자
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                입금액
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                통장 적요 / 입금자명
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                매칭 수강생
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                담당 강사
                            </th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                대사 결과
                            </th>
                            {canManage && (
                                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                    관리
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedDeposits.length === 0 ? (
                            <tr>
                                <td colSpan={canManage ? 7 : 6} className="px-6 py-10 text-center text-sm text-slate-500">
                                    조건에 맞는 입금 대사 내역이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            paginatedDeposits.map((item) => {
                                const displayStudent = item.matchedStudentName || item.student?.name || '';
                                const isConfirmed = item.reconciliationStatus === '입금확인';

                                return (
                                    <tr
                                        key={item.id}
                                        className={`hover:bg-slate-50 transition-colors ${!isConfirmed ? 'bg-amber-50/30' : ''}`}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-slate-700">
                                            {toUtcDateStr(item.depositDate)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-right text-slate-900">
                                            {item.amount.toLocaleString()}₫
                                        </td>
                                        <td className="px-4 py-3 text-xs sm:text-sm text-slate-600 max-w-md break-words">
                                            {item.description || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            {displayStudent ? (
                                                item.studentId ? (
                                                    <Link
                                                        href={`/admin/students/${item.studentId}`}
                                                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        {displayStudent}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium text-slate-800">{displayStudent}</span>
                                                )
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            {item.instructor?.name ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                                    {item.instructor.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            {isConfirmed ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    입금확인
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    미확인
                                                </span>
                                            )}
                                        </td>
                                        {canManage && (
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(item)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                        title="수정 / 매칭 변경"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(item)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
                    <div>
                        전체 <span className="font-semibold text-slate-900">{filteredDeposits.length}</span>건 중{' '}
                        <span className="font-semibold text-slate-900">{(safePage - 1) * pageSize + 1}</span> -{' '}
                        <span className="font-semibold text-slate-900">
                            {Math.min(safePage * pageSize, filteredDeposits.length)}
                        </span>
                        건 표시
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={safePage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="inline-flex items-center px-2.5 py-1 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            이전
                        </button>
                        <span className="px-3 py-1 font-medium">
                            {safePage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="inline-flex items-center px-2.5 py-1 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40"
                        >
                            다음
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingItem ? '입금 대사 내역 수정' : '신규 입금 내역 추가'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        입금일자 *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formDate}
                                        onChange={(e) => setFormDate(e.target.value)}
                                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        입금액 (VND) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        step={1}
                                        value={formAmount}
                                        onChange={(e) => setFormAmount(e.target.value)}
                                        placeholder="예: 8000000"
                                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    통장 적요 / 입금자명
                                </label>
                                <textarea
                                    rows={2}
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="통장에 찍힌 적요 또는 입금자명을 입력하세요"
                                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        등록 학생 연결 (선택)
                                    </label>
                                    <select
                                        value={formStudentId}
                                        onChange={(e) => handleStudentSelectChange(e.target.value)}
                                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">선택 안 함 (미지정)</option>
                                        {students.map((st) => (
                                            <option key={st.id} value={st.id}>
                                                {st.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        매칭 수강생 표시명
                                    </label>
                                    <input
                                        type="text"
                                        value={formMatchedStudentName}
                                        onChange={(e) => setFormMatchedStudentName(e.target.value)}
                                        placeholder="예: 홍길동"
                                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        담당 강사
                                    </label>
                                    <select
                                        value={formInstructorId}
                                        onChange={(e) => setFormInstructorId(e.target.value)}
                                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">미지정 (-)</option>
                                        {instructors.map((inst) => (
                                            <option key={inst.id} value={inst.id}>
                                                {inst.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        대사 결과
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value)}
                                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="입금확인">입금확인</option>
                                        <option value="미확인">미확인</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSaving ? '저장 중...' : '저장'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
