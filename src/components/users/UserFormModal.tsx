"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user?: any; // If provided, it's edit mode
}

export default function UserFormModal({ isOpen, onClose, onSuccess, user }: UserFormModalProps) {
    const isEditMode = !!user;

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        role: "INSTRUCTOR",
        color: "#E2E8F0",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && user) {
                setFormData({
                    email: user.email || "",
                    password: "", // Leave blank for edit unless changing
                    name: user.name || "",
                    role: user.role || "INSTRUCTOR",
                    color: user.color || "#E2E8F0",
                });
            } else {
                setFormData({
                    email: "",
                    password: "",
                    name: "",
                    role: "INSTRUCTOR",
                    color: "#E2E8F0",
                });
            }
            setError("");
        }
    }, [isOpen, isEditMode, user]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const url = isEditMode ? `/api/users/${user.id}` : "/api/users";
            const method = isEditMode ? "PUT" : "POST";

            // If edit mode and password is blank, remove it from payload
            const payload = { ...formData };
            if (isEditMode && !payload.password) {
                delete (payload as any).password;
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "처리 중 오류가 발생했습니다.");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-2 border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">
                        {isEditMode ? "사용자 수정" : "새 사용자 추가"}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">이름</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
                            placeholder="홍길동"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">이메일 (로그인 아이디)</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
                            placeholder="user@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            비밀번호 {isEditMode && <span className="text-slate-400 text-xs">(변경할 때만 입력)</span>}
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required={!isEditMode}
                            minLength={6}
                            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
                            placeholder={isEditMode ? "기존 비밀번호 유지" : "비밀번호 입력 (6자 이상)"}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">권한 (역할)</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
                        >
                            <option value="INSTRUCTOR">강사 (INSTRUCTOR)</option>
                            <option value="ADMIN">관리자 (ADMIN)</option>
                            <option value="OWNER">원장 (OWNER)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">시간표 표시 색상</label>
                        <div className="mt-1 flex items-center space-x-2">
                            <input
                                type="color"
                                name="color"
                                value={formData.color}
                                onChange={handleChange}
                                className="h-8 w-8 rounded border border-slate-300 cursor-pointer"
                            />
                            <span className="text-sm text-slate-500">{formData.color}</span>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 hover:bg-slate-50"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            {loading ? "저장 중..." : isEditMode ? "수정 완료" : "추가 하기"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
