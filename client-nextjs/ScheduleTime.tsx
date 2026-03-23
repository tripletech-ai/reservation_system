import React from 'react';
import { Clock, Plus, RefreshCcw, Loader2, ChevronLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callGasApi } from '../../utils/database';
import { useAuth } from '../../utils/auth';
import type { ScheduleMenu, ScheduleTime, ScheduleMenuWithTimes } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

// ── Component ─────────────────────────────────────────────────────────────────

const ScheduleTimes: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { manager } = useAuth();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isManualRefetching, setIsManualRefetching] = React.useState(false);

    // ── Query ──────────────────────────────────────────────────────────────────

    const {
        data: menuList = [],
        isLoading,
        isFetching,
        error,
        refetch,
        dataUpdatedAt,
    } = useQuery({
        queryKey: ['schedule_menus'],
        queryFn: async (): Promise<ScheduleMenuWithTimes[]> => {


            const res = await callGasApi<{ menus: ScheduleMenu[]; times: ScheduleTime[] }>({
                action: 'call',
                procedure: 'getManagerScheduleConfig',
                params: [manager?.uid]
            });

            const finalMenus = res?.menus || [];
            const finalTimes = res?.times || [];

            return finalMenus.map((menu) => ({
                ...menu,
                times: finalTimes.filter((t: ScheduleTime) => t.schedule_menu_uid === menu.uid),
            }));
        },
        staleTime: 1000 * 60 * 5,
    });


    const deleteMutation = useMutation({
        mutationFn: async (uid: string) => {
            if (!window.confirm('確定要刪除此排程模板嗎？此動作將連帶刪除所有時段與特別日期設定。')) return false;
            setIsDeleting(true);

            // 依照關聯性刪除
            const results = await Promise.all([
                callGasApi({ action: "delete", table: "schedule_time", where: `schedule_menu_uid = '${uid}'` }),
                callGasApi({ action: "delete", table: "schedule_override", where: `schedule_menu_uid = '${uid}'` }),
                callGasApi({ action: "delete", table: "schedule_menu", where: `uid = '${uid}'` }),
            ]);

            if (results.some(r => r === null)) throw new Error('部分資料刪除失敗');
            return true;
        },
        onSuccess: async (ok) => {
            if (ok) {
                await queryClient.invalidateQueries({ queryKey: ['schedule_menus'] });
            }
            setIsDeleting(false);
        },
        onError: (err: any) => {
            setIsDeleting(false);
            alert(err.message);
        },
    });

    if (error) console.error('Schedule Query Error:', error);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="animate-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.03em', margin: 0 }}>營業時間</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <p style={{ color: '#71717a', fontSize: '1rem' }}>管理不同活動的適用時段與每週排程</p>
                    {dataUpdatedAt > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8', fontSize: '0.8125rem', paddingLeft: '1rem', borderLeft: '1px solid #e2e8f0' }}>
                            <Clock size={14} />
                            最後更新：{new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="primary"
                        style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content' }}
                        onClick={() => navigate('/admin/schedule_time/new')}
                    >
                        <Plus size={18} />
                        新增時程
                    </button>
                    <button
                        onClick={async () => {
                            setIsManualRefetching(true);
                            await refetch();
                            setIsManualRefetching(false);
                        }}
                        disabled={isFetching}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', color: '#475569', padding: '0.625rem 1rem', fontSize: '0.875rem', borderRadius: '0.5rem' }}
                    >
                        <RefreshCcw size={16} className={isFetching ? 'animate-spin' : ''} />
                        {isFetching ? '更新中...' : '手動刷新'}
                    </button>
                </div>
            </div>

            {/* List */}
            {((isFetching && !isManualRefetching) || isLoading || isDeleting) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#64748b', padding: '6rem 0' }}>
                    <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                    <span style={{ fontWeight: 500 }}>{isDeleting ? '正在刪除資料...' : '正在讀取資料...'}</span>
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: '#ef4444' }}>
                    讀取失敗: {(error as Error).message}
                </div>
            ) : menuList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>尚無資料</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
                    {menuList.map((menu) => (
                        <div
                            key={menu.uid}
                            className="admin-card"
                            style={{ cursor: 'pointer', padding: '0.75rem', display: 'flex', flexDirection: 'column' }}
                            onClick={() => navigate(`/admin/schedule_time/${menu.uid}`, { state: { initialData: { menu, times: menu.times, overrides: [] } } })}
                        >
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#09090b', marginBottom: '0.375rem' }}>{menu.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: menu.times.length > 0 ? '#22c55e' : '#a1a1aa' }} />
                                    <p style={{ color: '#71717a', fontSize: '0.8125rem', fontWeight: 500 }}>
                                        {menu.times.length > 0 ? `共 ${menu.times.length} 個時段` : '尚未設定時段'}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fcfcfd', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #f1f1f4' }}>
                                {DAY_LABELS.map((label, dow) => {
                                    const slots = menu.times.filter((t) => t.day_of_week === dow);
                                    return (
                                        <div key={dow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                                            <span style={{ fontWeight: 600, color: slots.length > 0 ? '#3f3f46' : '#a1a1aa' }}>{label}</span>
                                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                                                {slots.length > 0
                                                    ? slots.map((s) => <span key={s.uid} style={{ color: '#18181b', fontWeight: 500 }}>{s.time_range}</span>)
                                                    : <span style={{ color: '#d4d4d8' }}>休息</span>
                                                }
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: '0.5rem', paddingTop: '0.25rem', borderTop: '1px solid #f1f1f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 500 }}>ID: {menu.uid}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteMutation.mutate(menu.uid);
                                        }}
                                        style={{
                                            padding: '4px',
                                            borderRadius: '6px',
                                            background: '#fff1f2',
                                            color: '#ef4444',
                                            border: '1px solid #fee2e2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            opacity: deleteMutation.isPending ? 0.5 : 1
                                        }}
                                        title="刪除模板"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div style={{ color: '#09090b', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    編輯 <ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
};

export default ScheduleTimes;
