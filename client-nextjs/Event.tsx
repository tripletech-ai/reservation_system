import React from 'react';
import { Edit2, Trash2, Loader2, RefreshCcw, Clock, Plus, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callGasApi } from '../../utils/database';
import { useAuth } from '../../utils/auth';
import { QUERY_CONFIG } from '../../utils/constants';
import type { EventData } from '../../types';


const Event: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { manager } = useAuth();
    const [isManualRefetching, setIsManualRefetching] = React.useState(false);

    // 取得活動列表
    const {
        data: { events = [], menus = [] } = {},
        isLoading,
        isFetching,
        error,
        refetch,
        dataUpdatedAt
    } = useQuery({
        queryKey: ['events_and_menus'],
        queryFn: async () => {
            const [events, menus] = await Promise.all([
                callGasApi<EventData[]>({
                    action: "select",
                    table: 'event',
                    where: `manager_uid = '${manager?.uid}' ORDER BY create_at DESC`
                }),
                callGasApi<{ uid: string; name: string }[]>({
                    action: "select",
                    table: 'schedule_menu',
                    where: `manager_uid = '${manager?.uid}'`
                })
            ]);
            return { events: events || [], menus: menus || [] };
        },
        enabled: !!manager?.uid,
        staleTime: QUERY_CONFIG.STALE_TIME,
    });

    // 刪除處理
    const deleteMutation = useMutation({
        mutationFn: async (uid: string) => {
            if (!confirm('確定要刪除此活動嗎？')) return;
            const res = await callGasApi({
                action: "delete",
                table: "event",
                where: `uid = '${uid}'`
            });
            if (!res) throw new Error('刪除失敗');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events_and_menus'] });
        },
        onError: (err: any) => alert(err.message)
    });





    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', margin: 0 }}>活動設定</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <p style={{ color: '#71717a', fontSize: '1rem' }}>管理您的所有預約活動與服務項目</p>
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
                        onClick={() => { navigate('/admin/event/new') }}
                    >
                        <Plus size={18} /> 新增活動
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {(isLoading || (isFetching && !isManualRefetching)) ? (
                    <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: '8rem' }}>
                        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                    </div>
                ) : error ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#ef4444' }}>
                        讀取失敗: {(error as Error).message}
                    </div>
                ) : events.length === 0 ? null : (
                    events.map(event => (
                        <div key={event.uid} className="admin-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        color: 'var(--primary)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '20px',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {event.booking_dynamic_url ? "已發佈" : "草稿"}
                                    </span>
                                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{event.create_at.split('T')[0]}</div>
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: '#1e293b' }}>{event.title}</h3>
                                <p style={{ color: '#64748b', fontSize: '0.925rem', marginBottom: '1.5rem', minHeight: '2.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {event.description || '暫無說明'}
                                </p>
                            </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                    {(() => {
                                        try {
                                            const selectedMenus = JSON.parse(event.schedule_menu_uid || '[]');
                                            return selectedMenus.map((sm: { uid: string }) => {
                                                const menuInfo = menus.find(m => m.uid === sm.uid);
                                                return (
                                                    <button
                                                        key={sm.uid}
                                                        onClick={() => {
                                                            const url = `${window.location.origin}/booking/${event.website_name}/${event.booking_dynamic_url}?schedule_menu_uid=${sm.uid}`;
                                                            window.open(url, '_blank');
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem',
                                                            background: '#eef2ff',
                                                            border: '1px solid #e0e7ff',
                                                            padding: '0.4rem 0.75rem',
                                                            borderRadius: '0.5rem',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            color: '#4f46e5',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <ExternalLink size={12} /> {menuInfo?.name || '專屬預約'}
                                                    </button>
                                                );
                                            });
                                        } catch (e) {
                                            return null;
                                        }
                                    })()}
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                                    <button
                                        onClick={() => navigate(`/admin/event/${event.uid}`)}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.625rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}
                                    >
                                        <Edit2 size={16} /> 編輯活動
                                    </button>
                                <button
                                    onClick={() => deleteMutation.mutate(event.uid)}
                                    title="刪除活動"
                                    style={{
                                        width: '42px',
                                        height: '42px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#fef2f2',
                                        border: '1px solid #fee2e2',
                                        color: '#eb8566ff',
                                        borderRadius: '0.5rem',
                                        padding: 0,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                >
                                    <Trash2 size={20} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Event;
