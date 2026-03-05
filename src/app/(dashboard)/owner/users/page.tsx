"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Users } from "lucide-react";
import UserFormModal from "@/components/users/UserFormModal";

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    color: string | null;
    createdAt: string;
}

export default function UsersManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/users");
            if (!res.ok) throw new Error("사용자 목록을 불러오지 못했습니다.");
            const data = await res.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateClick = () => {
        setEditingUser(undefined);
        setIsModalOpen(true);
    };

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (userId: string, userName: string) => {
        if (!confirm(`'${userName}' 계정을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "삭제 실패");
            }

            alert("사용자가 삭제되었습니다.");
            fetchUsers(); // Refresh list
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleModalSuccess = () => {
        fetchUsers(); // Refresh after create/update
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "OWNER": return "bg-purple-100 text-purple-800";
            case "ADMIN": return "bg-blue-100 text-blue-800";
            case "INSTRUCTOR": return "bg-green-100 text-green-800";
            default: return "bg-slate-100 text-slate-800";
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "OWNER": return "대표 원장";
            case "ADMIN": return "관리자";
            case "INSTRUCTOR": return "강사";
            default: return role;
        }
    };

    if (loading && users.length === 0) {
        return <div className="p-8 text-center text-slate-500">사용자 목록을 불러오는 중입니다...</div>;
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" />
                        시스템 사용자 관리
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        학원 시스템에 접근할 수 있는 원장, 관리자, 강사 계정을 관리합니다.
                    </p>
                </div>
                <button
                    onClick={handleCreateClick}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <Plus className="w-4 h-4 mr-2" />새 사용자 추가
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">이름</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">이메일 (아이디)</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">역할</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">시간표 색상</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-slate-900">{user.name}</div>
                                        <div className="text-xs text-slate-500">가입: {new Date(user.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-6 h-6 rounded border border-slate-300 shadow-sm"
                                                style={{ backgroundColor: user.color || '#E2E8F0' }}
                                            />
                                            <span className="text-xs text-slate-500 uppercase">{user.color || '#E2E8F0'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-3">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded transition-colors"
                                            >
                                                <Edit2 className="w-3 h-3" /> 수정
                                            </button>

                                            {user.role !== "OWNER" && (
                                                <button
                                                    onClick={() => handleDeleteClick(user.id, user.name)}
                                                    className="text-red-600 hover:text-red-900 flex items-center gap-1 bg-red-50 px-2 py-1 rounded"
                                                >
                                                    <Trash2 className="w-3 h-3" /> 삭제
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                user={editingUser}
            />
        </div>
    );
}
