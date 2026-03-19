import React, { useState, useMemo } from 'react';
import { Calendar, Search, X, User, Clock, Phone, ChevronLeft, ChevronRight, Loader2, RefreshCcw, CheckCircle2, XCircle, BanknoteIcon } from 'lucide-react';
import { callGasApi } from '../../utils/database';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Booking } from '../../types';
import { useAuth } from '../../utils/auth';
import { TIME_SLOT_INTERVAL } from '../../utils/constants';

const ITEMS_PER_PAGE = 10;

const deleteType = 0 //0 直接刪除 1 更新預約狀態

const StatusBadge: React.FC<{ isCancelled: boolean }> = ({ isCancelled }) => (
    <span style={{
        padding: '0.2rem 0.6rem',
        borderRadius: '2rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        background: isCancelled ? '#fee2e2' : '#dcfce7',
        color: isCancelled ? '#dc2626' : '#16a34a',
    }}>
        {isCancelled ? '已取消' : '預約中'}
    </span>
);

const Bookings: React.FC = () => {
    const queryClient = useQueryClient();
    const { manager } = useAuth();
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [searchText, setSearchText] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isManualRefetching, setIsManualRefetching] = useState(false);

    const {
        data: bookingList = [],
        isLoading,
        isFetching,
        error,
        refetch,
        dataUpdatedAt
    } = useQuery({
        queryKey: ['bookings', manager?.uid],
        queryFn: async () => {
            const result = await callGasApi<Booking[]>({
                action: 'select',
                table: 'booking',
                where: `manager_uid = '${manager?.uid}' ORDER BY booking_start_time ASC`
            });
            return result || [];
        },
        staleTime: 1000 * 60 * 5,
    });

    const cancelMutation = useMutation({
        mutationFn: async (uid: string) => {
            if (!window.confirm('確定要取消此預約嗎？')) throw new Error('已取消操作');
            const res = await callGasApi({
                action: 'call',
                procedure: 'cancelBooking',
                params: [uid, TIME_SLOT_INTERVAL, deleteType]
            });
            if (!res) throw new Error('取消失敗');
            return uid;
        },
        onSuccess: (uid) => {
            queryClient.setQueryData(['bookings', manager?.uid], (old: Booking[] | undefined) =>
                old ? old.map(b => b.uid === uid ? { ...b, is_cancelled: true } : b) : []
            );
            if (selectedBooking?.uid === uid) {
                setSelectedBooking(prev => prev ? { ...prev, is_cancelled: true } : null);
            }
        },
        onError: (err: any) => {
            if (err.message !== '已取消操作') alert(err.message);
        }
    });

    const depositMutation = useMutation({
        mutationFn: async ({ uid, current }: { uid: string; current: boolean }) => {
            const res = await callGasApi({
                action: 'update',
                table: 'booking',
                where: `uid = '${uid}'`,
                data: { is_deposit_received: current ? 0 : 1, update_at: new Date().toISOString() }
            });
            if (!res) throw new Error('更新失敗');
            return { uid, newVal: !current };
        },
        onSuccess: ({ uid, newVal }) => {
            queryClient.setQueryData(['bookings', manager?.uid], (old: Booking[] | undefined) =>
                old ? old.map(b => b.uid === uid ? { ...b, is_deposit_received: newVal } : b) : []
            );
            if (selectedBooking?.uid === uid) {
                setSelectedBooking(prev => prev ? { ...prev, is_deposit_received: newVal } : null);
            }
        },
        onError: (err: any) => alert(err.message)
    });

    const filtered = useMemo(() => {
        if (!searchText.trim()) return bookingList;
        const kw = searchText.toLowerCase();
        return bookingList.filter(b =>
            b.name?.toLowerCase().includes(kw) ||
            b.phone?.toString().includes(kw) ||
            b.booking_start_time?.includes(kw)
        );
    }, [bookingList, searchText]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const formatDateTime = (dt: string) => {
        if (!dt) return '—';
        const d = new Date(dt);
        return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <div className="animate-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>預約管理</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <p style={{ color: '#71717a', fontSize: '1rem' }}>管理所有到來的預約紀錄</p>
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
                    <RefreshCcw size={16} className={isFetching ? 'animate-spin' : ''} />
                    {isFetching ? '更新中...' : '手動刷新'}
                </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '420px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                    type="text"
                    value={searchText}
                    placeholder="搜尋姓名、電話、日期..."
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
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: '#ef4444' }}>讀取失敗</div>
                ) : paginated.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
                        {searchText ? '查無符合的預約紀錄' : '尚無預約資料'}
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                {['會員姓名', '電話', '服務', '開始時間', '結束時間', '狀態', '訂金'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((b, i) => (
                                <tr
                                    key={b.uid}
                                    onClick={() => setSelectedBooking(b)}
                                    style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f7ff')}
                                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa')}
                                >
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{b.name || '—'}</td>
                                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem' }}>{b.phone || '—'}</td>
                                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {b.service_item}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatDateTime(b.booking_start_time)}</td>
                                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatDateTime(b.booking_end_time)}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}><StatusBadge isCancelled={!!b.is_cancelled} /></td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: b.is_deposit_received ? '#16a34a' : '#94a3b8' }}>
                                            {b.is_deposit_received ? '已收' : '未收'}
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
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', color: currentPage === 1 ? '#cbd5e1' : '#475569', display: 'flex', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            style={{ minWidth: '2.25rem', height: '2.25rem', padding: 0, background: currentPage === i + 1 ? 'var(--primary-gradient)' : '#fff', border: '1px solid', borderColor: currentPage === i + 1 ? 'transparent' : '#e2e8f0', borderRadius: '0.5rem', color: currentPage === i + 1 ? '#fff' : '#475569', fontWeight: 600, fontSize: '0.875rem' }}
                        >
                            {i + 1}
                        </button>
                    ))}
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{ padding: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', color: currentPage === totalPages ? '#cbd5e1' : '#475569', display: 'flex', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {selectedBooking && (
                <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>預約詳細資料</h2>
                            <button onClick={() => setSelectedBooking(null)} style={{ background: 'transparent', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <X size={20} color="#64748b" />
                            </button>
                        </div>
                        <div className="modal-body">
                            {/* Avatar + Name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '1.25rem', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.75rem', fontWeight: 700, boxShadow: '0 8px 16px rgba(99,102,241,0.2)' }}>
                                    {selectedBooking.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>{selectedBooking.name}</h3>
                                    <StatusBadge isCancelled={!!selectedBooking.is_cancelled} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <Phone size={16} /> 電話
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{selectedBooking.phone || '—'}</div>
                                </div>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <User size={16} /> 服務
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>
                                        {selectedBooking.service_item}
                                    </div>
                                </div>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <Calendar size={16} /> 開始時間
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{formatDateTime(selectedBooking.booking_start_time)}</div>
                                </div>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <Clock size={16} /> 結束時間
                                    </label>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{formatDateTime(selectedBooking.booking_end_time)}</div>
                                </div>
                                <div className="info-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                        <BanknoteIcon size={16} /> 訂金狀態
                                    </label>
                                    <div style={{ fontWeight: 600, color: selectedBooking.is_deposit_received ? '#16a34a' : '#94a3b8' }}>
                                        {selectedBooking.is_deposit_received ? '已收訂金' : '尚未收訂金'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setSelectedBooking(null)} style={{ background: '#f1f5f9', color: '#475569' }}>關閉</button>

                            {!selectedBooking.is_cancelled && (
                                <>
                                    <button
                                        onClick={() => depositMutation.mutate({ uid: selectedBooking.uid, current: !!selectedBooking.is_deposit_received })}
                                        disabled={depositMutation.isPending || !!selectedBooking.is_cancelled}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: selectedBooking.is_deposit_received ? '#f1f5f9' : '#dcfce7', color: selectedBooking.is_deposit_received ? '#475569' : '#16a34a', opacity: selectedBooking.is_cancelled ? 0.5 : 1 }}
                                    >
                                        <BanknoteIcon size={16} />
                                        {selectedBooking.is_deposit_received ? '標記未收訂金' : '標記已收訂金'}
                                    </button>
                                    <button
                                        onClick={() => cancelMutation.mutate(selectedBooking.uid)}
                                        disabled={cancelMutation.isPending}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fee2e2', color: '#dc2626' }}
                                    >
                                        <XCircle size={16} />
                                        取消預約
                                    </button>
                                </>

                            )}
                            {/* {selectedBooking.is_cancelled && (
                                <button
                                    onClick={() => cancelMutation.mutate(selectedBooking.uid)}
                                    disabled={cancelMutation.isPending}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#dcfce7', color: '#16a34a' }}
                                >
                                    <CheckCircle2 size={16} />
                                    恢復預約
                                </button>
                            )} */}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Bookings;
