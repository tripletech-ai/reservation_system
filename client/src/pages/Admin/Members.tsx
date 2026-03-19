import React, { useState, useMemo } from 'react';
import { Search, Filter, X, Mail, Calendar, ShieldCheck, Phone, MapPin, Power, Loader2, RefreshCcw, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { callGasApi } from '../../utils/database';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Member } from '../../types';
import { useAuth } from '../../utils/auth';

const STATUS_MAP: Record<number, string> = {
    0: '休眠',
    1: '活躍'
};

const ITEMS_PER_PAGE = 10;

const Members: React.FC = () => {
    const queryClient = useQueryClient();
    const { manager } = useAuth();
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [searchText, setSearchText] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isManualRefetching, setIsManualRefetching] = useState(false);

    // 使用 TanStack Query 取得會員列表
    const {
        data: memberList = [],
        isLoading,
        isFetching,
        error,
        refetch,
        dataUpdatedAt
    } = useQuery({
        queryKey: ['members', manager?.uid],
        queryFn: async () => {
            const result = await callGasApi<Member[]>({
                action: "select",
                table: 'member',
                where: `manager_uid = '${manager?.uid}' ORDER BY create_at DESC`
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
            queryClient.invalidateQueries({ queryKey: ['members'] });
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

    // 搜尋過濾邏輯
    const filteredMembers = useMemo(() => {
        if (!searchText.trim()) return memberList;
        const kw = searchText.toLowerCase();
        return memberList.filter(m =>
            m.name?.toLowerCase().includes(kw) ||
            m.phone?.toString().includes(kw) ||
            m.email?.toLowerCase().includes(kw)
        );
    }, [memberList, searchText]);

    // 分頁邏輯
    const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
    const paginatedMembers = filteredMembers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <div className="animate-in">
            {/* Header */}
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
                    onClick={async () => { setIsManualRefetching(true); await refetch(); setIsManualRefetching(false); }}
                    disabled={isFetching}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', color: '#475569', padding: '0.625rem 1rem', fontSize: '0.875rem', borderRadius: '0.5rem' }}
                >
                    <RefreshCcw size={16} className={isFetching ? "animate-spin" : ""} />
                    {isFetching ? '更新中...' : '手動刷新'}
                </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '420px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                    type="text"
                    value={searchText}
                    placeholder="搜尋姓名、電話、郵箱..."
                    onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
                    style={{ width: '100%', paddingLeft: '2.5rem', height: '40px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', color: '#1e293b', outline: 'none' }}
                />
            </div>

            <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                {(isLoading || (isFetching && !isManualRefetching)) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#64748b', padding: '6rem 0' }}>
                        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                        <span style={{ fontWeight: 500 }}>正在讀取資料...</span>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: '#ef4444' }}>
                        讀取失敗: {(error as Error).message}
                    </div>
                ) : paginatedMembers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
                        {searchText ? '查無符合的會員資料' : '尚無會員資料'}
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                {['姓名', '電話號碼', '加入日期', '狀態'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedMembers.map((member, i) => (
                                <tr
                                    key={member.uid}
                                    onClick={() => setSelectedMember(member)}
                                    style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f7ff')}
                                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa')}
                                >
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{member.name}</td>
                                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem' }}>{member.phone}</td>
                                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem' }}>{member.create_at.split('T')[0]}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            color: member.status === 1 ? '#22c55e' : '#ef4444',
                                            fontWeight: 600,
                                            fontSize: '0.85rem'
                                        }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                            {STATUS_MAP[member.status] || '未知'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{ padding: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', color: currentPage === 1 ? '#cbd5e1' : '#475569', display: 'flex', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => handlePageChange(i + 1)}
                            style={{ minWidth: '2.25rem', height: '2.25rem', padding: 0, background: currentPage === i + 1 ? 'var(--primary-gradient)' : '#fff', border: '1px solid', borderColor: currentPage === i + 1 ? 'transparent' : '#e2e8f0', borderRadius: '0.5rem', color: currentPage === i + 1 ? '#fff' : '#475569', fontWeight: 600, fontSize: '0.875rem' }}
                        >
                            {i + 1}
                        </button>
                    ))}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        style={{ padding: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', color: currentPage === totalPages ? '#cbd5e1' : '#475569', display: 'flex', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

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

                            {/* Questionnaire */}
                            {(() => {
                                if (!selectedMember.questionnaire) return null;
                                try {
                                    const qa: { title: string; ans: string }[] = JSON.parse(selectedMember.questionnaire);
                                    if (!Array.isArray(qa) || qa.length === 0) return null;
                                    return (
                                        <div style={{ marginTop: '1.5rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: 600 }}>
                                                📋 偏好問卷
                                            </label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {qa.map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{item.title}</span>
                                                        <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700, background: '#e0e7ff', padding: '0.2rem 0.65rem', borderRadius: '2rem' }}>
                                                            {item.ans || '—'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                } catch {
                                    return null;
                                }
                            })()}

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
