import React, { useState } from 'react';
import { Search, Filter, X, Mail, Calendar, ShieldCheck, Phone, MapPin, Power, Loader2, RefreshCcw, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { callGasApi } from '../../utils/database';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Member } from '../../types';
import { useAuth } from '../../utils/auth';

const STATUS_MAP: Record<number, string> = {
    0: '休眠',
    1: '活躍'
};

const Members: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const { manager } = useAuth()
    const itemsPerPage = 10;

    // 使用 TanStack Query 取得會員列表
    const {
        data: memberList = [],
        isLoading,
        isFetching,
        error,
        refetch,
        dataUpdatedAt
    } = useQuery({
        queryKey: ['members'],
        queryFn: async () => {
            const result = await callGasApi<Member[]>({
                action: "select",
                table: 'member',
                where: `manager_uid = '${manager.uid}' ORDER BY create_at DESC`
            });
            return result || [];
        },
        staleTime: 1000 * 60 * 5,
    });

    if (error) console.error("TanStack Query Error:", error);

    // 使用 Mutation 處理狀態更新
    const toggleStatusMutation = useMutation({
        mutationFn: async ({ uid, newStatus }: { uid: string, newStatus: number }) => {
            const success = await callGasApi({
                action: "update",
                table: "member",
                where: `uid = '${uid}'`,
                data: { status: newStatus }
            });
            if (!success) throw new Error('更新失敗');
            return { uid, newStatus };
        },
        onSuccess: (data) => {
            // 讓 members 緩存失效，觸發背後重抓
            queryClient.invalidateQueries({ queryKey: ['members'] });

            // 同步更新彈窗內的狀態
            if (selectedMember?.uid === data.uid) {
                setSelectedMember(prev => prev ? { ...prev, status: data.newStatus } : null);
            }
        },
        onError: (error: any) => {
            alert(error.message);
        }
    });

    const toggleStatus = (uid: string) => {
        const currentMember = memberList.find(m => m.uid === uid);
        if (!currentMember) return;
        const newStatus = currentMember.status === 0 ? 1 : 0;
        toggleStatusMutation.mutate({ uid, newStatus });
    };

    // 分頁邏輯
    const totalPages = Math.ceil(memberList.length / itemsPerPage);
    const paginatedMembers = memberList.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // 切換分頁時回到頂部或做其他體驗優化
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>會員管理</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <p style={{ color: '#71717a', fontSize: '1rem' }}>管理系統內的所有註冊會員資料</p>
                        {dataUpdatedAt > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8', fontSize: '0.8125rem', paddingLeft: '1rem', borderLeft: '1px solid #e2e8f0' }}>
                                <Clock size={14} />
                                最後更新：{new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        padding: '0.625rem 1rem',
                        fontSize: '0.875rem'
                    }}
                >
                    <RefreshCcw size={16} className={isFetching ? "animate-spin" : ""} />
                    {isFetching ? '更新中...' : '手動刷新'}
                </button>
            </div>

            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input type="text" placeholder="搜尋會員名稱、郵箱..." style={{ width: '100%', paddingLeft: '2.75rem', color: '#1e293b', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
                    </div>
                    <button style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={18} /> 篩選
                    </button>
                </div>

                <table style={{ position: 'relative' }}>
                    <thead>
                        <tr>
                            <th>姓名</th>
                            <th>電話號碼</th>
                            <th>加入日期</th>
                            <th>狀態</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '4rem 0' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#64748b' }}>
                                        <Loader2 className="animate-spin" size={32} />
                                        <span>正在讀取資料...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '4rem 0', color: '#ef4444' }}>
                                    讀取失敗: {(error as Error).message}
                                </td>
                            </tr>
                        ) : memberList.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
                                    尚無資料
                                </td>
                            </tr>
                        ) : (
                            paginatedMembers.map(member => (
                                <tr
                                    key={member.uid}
                                    onClick={() => setSelectedMember(member)}
                                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                                >
                                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{member.name}</td>
                                    <td style={{ color: '#64748b' }}>{member.phone}</td>
                                    <td>{member.create_at.split('T')[0]}</td>
                                    <td>
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            color: member.status === 1 ? '#22c55e' : '#ef4444',
                                            fontWeight: 500
                                        }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                            {STATUS_MAP[member.status] || '未知'}
                                        </span>
                                    </td>

                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination Footer */}
                {!isLoading && !error && memberList.length > 0 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '1.5rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid #f1f5f9'
                    }}>
                        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                            顯示第 {(currentPage - 1) * itemsPerPage + 1} 至 {Math.min(currentPage * itemsPerPage, memberList.length)} 筆，共 {memberList.length} 筆
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '0.5rem',
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.5rem',
                                    color: currentPage === 1 ? '#cbd5e1' : '#475569',
                                    display: 'flex',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <ChevronLeft size={18} />
                            </button>

                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => handlePageChange(i + 1)}
                                    style={{
                                        minWidth: '2.25rem',
                                        height: '2.25rem',
                                        padding: '0',
                                        background: currentPage === i + 1 ? 'var(--primary-gradient)' : '#fff',
                                        border: '1px solid',
                                        borderColor: currentPage === i + 1 ? 'transparent' : '#e2e8f0',
                                        borderRadius: '0.5rem',
                                        color: currentPage === i + 1 ? '#fff' : '#475569',
                                        fontWeight: 600,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '0.5rem',
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.5rem',
                                    color: currentPage === totalPages ? '#cbd5e1' : '#475569',
                                    display: 'flex',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Member Details Dialog */}
            {selectedMember && (
                <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>會員詳細資料</h2>
                            <button
                                onClick={() => setSelectedMember(null)}
                                style={{ background: 'transparent', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                <X size={20} color="#64748b" />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '1.5rem',
                                    background: 'var(--primary-gradient)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)'
                                }}>
                                    {selectedMember.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>{selectedMember.name}</h3>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <span style={{
                                            padding: '0.125rem 0.625rem',
                                            borderRadius: '2rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: '#f1f5f9',
                                            color: '#64748b'
                                        }}>
                                            ID: #{selectedMember.uid.toString().padStart(4, '0')}
                                        </span>

                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <Mail size={16} /> 電子郵件
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{selectedMember.email}</div>
                                </div>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <Phone size={16} /> 電話號碼
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{selectedMember.phone}</div>
                                </div>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <Calendar size={16} /> 加入日期
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{selectedMember.create_at.split('T')[0]}</div>
                                </div>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <ShieldCheck size={16} /> 帳號狀態
                                    </label>
                                    <div style={{
                                        fontWeight: 600,
                                        color: selectedMember.status === 1 ? '#22c55e' : '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem'
                                    }}>
                                        {STATUS_MAP[selectedMember.status] || '未知'}
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button
                                onClick={() => setSelectedMember(null)}
                                style={{ background: '#f1f5f9', color: '#475569' }}
                            >
                                關閉
                            </button>
                            <button
                                className="primary"
                                style={{
                                    background: selectedMember.status === 1 ? '#f1f5f9' : 'var(--primary-gradient)',
                                    color: selectedMember.status === 1 ? '#475569' : 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onClick={() => toggleStatus(selectedMember.uid)}
                            >
                                <Power size={16} />
                                {selectedMember.status === 1 ? '切換為休眠' : '切換為活躍'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Members;


