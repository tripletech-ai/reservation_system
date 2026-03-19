import React, { useEffect, useState } from 'react';
import {
    ChevronLeft, Save, Plus, Trash2,
    Clock, Users, Loader2,
    Calendar, Edit
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callGasApi } from '../../utils/database';
import { generateUid } from '../../utils/id';
import type { ScheduleMenu, ScheduleTime, ScheduleOverride } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2).toString().padStart(2, '0');
    const minutes = (i % 2 === 0 ? '00' : '30');
    return `${hours}:${minutes}`;
});

const END_TIME_OPTIONS = [...TIME_OPTIONS.slice(1), '23:59'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toISOString().split('T')[0];
    } catch {
        return dateStr;
    }
};

const makeTempTime = (menuUid: string, dow: number): ScheduleTime => ({
    uid: generateUid("_new_"),
    schedule_menu_uid: menuUid,
    time_range: '09:00-18:00',
    day_of_week: dow, // 這裡的 dow 預期已經是 1-7
    max_capacity: 2,
    is_open: true,
    is_open_last_booking_time: false,
    last_booking_time: '17:00',
    create_at: new Date().toISOString(),
    update_at: new Date().toISOString(),
});

// ── Component ─────────────────────────────────────────────────────────────────

import { useAuth } from '../../utils/auth';

const ScheduleTimeEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { manager } = useAuth();
    const isNew = id === 'new';

    const initialDataFromState = location.state?.initialData as { menu: ScheduleMenu; times: ScheduleTime[]; overrides: ScheduleOverride[] } | undefined;
    const [targetUid] = useState(() => isNew ? generateUid() : id!);

    // ── 取得原始資料（只有編輯模式才 query）──
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['schedule_menu', targetUid],
        queryFn: async () => {
            let menu = initialDataFromState?.menu || null;
            let times = initialDataFromState?.times || [];
            
            // 編輯模式下，必定請求 overrides
            const overrides = await callGasApi<ScheduleOverride[]>({ 
                action: 'select', 
                table: 'schedule_override', 
                where: `schedule_menu_uid = '${targetUid}' ORDER BY override_date DESC` 
            });

            // 如果是直接網址進入 (無 state)，則抓取全部
            if (!menu && !isNew) {
                const [menusRes, timesRes] = await Promise.all([
                    callGasApi<ScheduleMenu[]>({ action: 'select', table: 'schedule_menu', where: `uid = '${targetUid}' LIMIT 1` }),
                    callGasApi<ScheduleTime[]>({ action: 'select', table: 'schedule_time', where: `schedule_menu_uid = '${targetUid}' ORDER BY day_of_week ASC` }),
                ]);
                menu = menusRes?.[0] ?? null;
                times = timesRes || [];
            } else if (isNew && !menu) {
                // 新增模式且無初始資料
                menu = { uid: targetUid, manager_uid: manager?.uid || '', name: '未命名模板', create_at: '', update_at: '' };
                times = [];
            }

            return { menu, times, overrides: overrides || [] };
        },
        enabled: !!targetUid,
        staleTime: 1000 * 60 * 5, // 快取 5 分鐘
        gcTime: 1000 * 60 * 30, // 快取存留 30 分鐘
    });

    // ── 本地編輯狀態 ──
    const [name, setName] = useState('');
    const [times, setTimes] = useState<ScheduleTime[]>([]);
    const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
    const [deletedUids, setDeletedUids] = useState<string[]>([]);
    const [loadedUid, setLoadedUid] = useState<string | null>(null);

    useEffect(() => {
        if (data && loadedUid !== targetUid) {
            setName(data.menu?.name ?? '');
            setTimes(data.times || []);
            setOverrides(data.overrides || []);
            setLoadedUid(targetUid);
        }
    }, [data, targetUid, loadedUid]);

    // ── Override Modal State ──
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOverride, setEditingOverride] = useState<ScheduleOverride | null>(null);

    const addSlot = (dow: number) => {
        setTimes((prev) => [...prev, makeTempTime(targetUid, dow)]);
    };

    const removeSlot = (uid: string) => {
        setTimes((prev) => prev.filter((t) => t.uid !== uid));
        if (!uid.startsWith('_new_')) setDeletedUids((prev) => [...prev, uid]);
    };

    const updateSlot = <K extends keyof ScheduleTime>(uid: string, key: K, value: ScheduleTime[K]) => {
        setTimes((prev) => prev.map((t) => (t.uid === uid ? { ...t, [key]: value } : t)));
    };

    const updateDayLastBooking = (dow: number, updates: Partial<ScheduleTime>) => {
        setTimes((prev) => prev.map((t) => (t.day_of_week === dow ? { ...t, ...updates } : t)));
    };

    const toggleDay = (dow: number, currentlyEnabled: boolean) => {
        if (currentlyEnabled) {
            const slotsToRemove = times.filter((t) => t.day_of_week === dow);
            slotsToRemove.forEach((s) => removeSlot(s.uid));
        } else {
            addSlot(dow);
        }
    };

    const [tempIsClosed, setTempIsClosed] = useState(false);
    const [isSavingOverride, setIsSavingOverride] = useState(false);

    // ── Override Actions ──
    const openAddModal = () => {
        setEditingOverride(null);
        setTempIsClosed(false);
        setIsModalOpen(true);
    };

    const openEditModal = (override: ScheduleOverride) => {
        setEditingOverride(override);
        setTempIsClosed(override.is_closed);
        setIsModalOpen(true);
    };

    const deleteOverride = async (uid: string) => {
        if (!window.confirm('確定要刪除此特別日期設定嗎？')) return;
        const res = await callGasApi({
            action: "delete",
            table: "schedule_override",
            where: `uid = '${uid}'`
        });
        if (res) {
            setOverrides(prev => {
                const next = prev.filter(o => o.uid !== uid);
                queryClient.setQueryData(['schedule_menu', targetUid], (old: any) => old ? { ...old, overrides: next } : old);
                return next;
            });
        } else {
            alert('刪除失敗');
        }
    };

    const saveOverride = async (overrideData: Partial<ScheduleOverride>) => {
        const inputDate = overrideData.override_date || '';

        const isDuplicate = overrides.some(o =>
            formatDateForInput(o.override_date) === formatDateForInput(inputDate) &&
            o.uid !== editingOverride?.uid
        );

        if (isDuplicate) {
            alert('此日期已經有特別設定了，請直接編輯該日期。');
            return;
        }
        const now = new Date().toISOString();
        const targetUidOverride = editingOverride?.uid || generateUid();

        setIsSavingOverride(true);
        try {
            let res;
            if (editingOverride) {
                res = await callGasApi({
                    action: "update",
                    table: "schedule_override",
                    where: `uid = '${editingOverride.uid}'`,
                    data: {
                        override_date: inputDate,
                        override_time: overrideData.override_time,
                        max_capacity: overrideData.max_capacity,
                        is_closed: tempIsClosed ? 1 : 0,
                        update_at: now
                    }
                });
            } else {
                res = await callGasApi({
                    action: "insert",
                    table: "schedule_override",
                    data: {
                        uid: targetUidOverride,
                        schedule_menu_uid: targetUid,
                        override_date: inputDate,
                        override_time: overrideData.override_time,
                        max_capacity: overrideData.max_capacity,
                        is_closed: tempIsClosed ? 1 : 0,
                        create_at: now,
                        update_at: now
                    }
                });
            }

            if (res) {
                let updatedOverrides: ScheduleOverride[] = [];
                if (editingOverride) {
                    setOverrides(prev => {
                        updatedOverrides = prev.map(o => o.uid === editingOverride.uid ? { ...o, ...overrideData, update_at: now } as ScheduleOverride : o);
                        queryClient.setQueryData(['schedule_menu', targetUid], (old: any) => old ? { ...old, overrides: updatedOverrides } : old);
                        return updatedOverrides;
                    });
                } else {
                    const newOverride: ScheduleOverride = {
                        uid: targetUidOverride,
                        schedule_menu_uid: targetUid,
                        override_date: inputDate,
                        override_time: overrideData.override_time || '09:00-18:00',
                        max_capacity: overrideData.max_capacity || 2,
                        is_closed: tempIsClosed,
                        create_at: now,
                        update_at: now
                    };
                    setOverrides(prev => {
                        updatedOverrides = [newOverride, ...prev];
                        queryClient.setQueryData(['schedule_menu', targetUid], (old: any) => old ? { ...old, overrides: updatedOverrides } : old);
                        return updatedOverrides;
                    });
                }
                setIsModalOpen(false);
            } else {
                alert('儲存失敗');
            }
        } finally {
            setIsSavingOverride(false);
        }
    };
    const saveMutation = useMutation({
        mutationFn: async () => {
            const original = data || { menu: null, times: [], overrides: [] };
            
            // ── 變動偵測 ──
            const isNameChanged = name !== (original.menu?.name || '');
            
            // 這裡簡單化對比，若有新增或刪除或內容變化皆視為變動
            const hasDeleted = deletedUids.length > 0;
            const hasNew = times.some(t => t.uid.startsWith('_new_'));
            
            // 檢查是否有實質內容變化
            let isDirty = isNameChanged || hasDeleted || hasNew;
            if (!isDirty) {
                // 深度檢查每個時段內容
                for (const t of times) {
                    if (t.uid.startsWith('_new_')) continue;
                    const orig = original.times.find(ot => ot.uid === t.uid);
                    if (!orig || 
                        orig.time_range !== t.time_range || 
                        orig.max_capacity !== t.max_capacity || 
                        Boolean(orig.is_open) !== Boolean(t.is_open) ||
                        orig.last_booking_time !== t.last_booking_time
                    ) {
                        isDirty = true;
                        break;
                    }
                }
            }

            if (!isDirty) return 'NO_CHANGES';

            // ── 調用 Procedure ──
            const savePayload = {
                menu: {
                    uid: targetUid,
                    manager_uid: manager?.uid || '',
                    name: name
                },
                times: times.map(t => ({
                    ...t,
                    uid: t.uid.startsWith('_new_') ? generateUid() : t.uid,
                    schedule_menu_uid: targetUid,
                    is_open: t.is_open ? 1 : 0,
                    is_open_last_booking_time: t.is_open_last_booking_time ? 1 : 0
                })),
                deleted_time_uids: deletedUids
            };

            const res = await callGasApi({
                action: 'call',
                procedure: 'saveScheduleConfig',
                params: [JSON.stringify(savePayload)]
            });

            if (!res || (res.result && !res.result.success)) {
                 throw new Error(res?.result?.message || '儲存失敗');
            }

            return 'SUCCESS';
        },
        onSuccess: (result) => {
            if (result === 'NO_CHANGES') {
                navigate('/admin/schedule_time');
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['schedule_menus'] });
            queryClient.invalidateQueries({ queryKey: ['schedule_menu', targetUid] });
            navigate('/admin/schedule_time');
        },
        onError: (err: any) => alert(err.message),
    });

    // 只有在完全沒有資料且正在初始讀取時才顯示全頁面遮罩
    if (isLoading && !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                    <p style={{ color: '#64748b', fontWeight: 500 }}>正在載入排程設定...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={() => navigate('/admin/schedule_time')}
                        style={{ background: 'white', border: '1px solid #e2e2e7', padding: '0.35rem', borderRadius: '0.5rem', display: 'flex', color: '#71717a' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#09090b', letterSpacing: '-0.02em', lineHeight: 1.2 }}>編輯排程時間</h1>
                            {isFetching && (
                                <Loader2 size={16} className="animate-spin" color="#94a3b8" />
                            )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#a1a1aa', fontFamily: 'monospace' }}>{id}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => navigate('/admin/schedule_time')}
                        style={{ height: '36px', padding: '0 1rem', background: '#f4f4f5', color: '#18181b', border: 'none', borderRadius: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
                    >
                        取消
                    </button>
                    <button
                        className="primary"
                        disabled={saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                        style={{ height: '36px', padding: '0 1.25rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: saveMutation.isPending ? 0.7 : 1 }}
                    >
                        {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
                        {saveMutation.isPending ? '儲存中...' : '儲存'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem', alignItems: 'start' }}>
                {/* Left Column: General Settings & Daily Slots */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="admin-card" style={{ padding: '0.75rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: '#71717a' }}>模板名稱</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例如：一般營業時間"
                            style={{ width: '100%', height: '36px', borderRadius: '0.5rem', border: '1px solid #e2e2e7', padding: '0 0.75rem', fontSize: '0.9375rem' }}
                        />
                    </div>

                    <div className="admin-card" style={{ padding: '0.75rem' }}>
                        <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#09090b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={14} /> 每日時段設定
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {DAY_LABELS.map((label, index) => {
                                const dbDow = index + 1; // 1=週一, 7=週日
                                const slots = times.filter((t) => t.day_of_week === dbDow);
                                const enabled = slots.length > 0;

                                return (
                                    <div
                                        key={index}
                                        style={{
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '0.75rem',
                                            border: '1px solid',
                                            borderColor: enabled ? '#e2e2e7' : '#f0f0f1',
                                            background: enabled ? 'white' : '#fafafa',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: enabled ? '0.35rem' : 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                                <div
                                                    onClick={() => toggleDay(dbDow, enabled)}
                                                    style={{
                                                        width: '32px',
                                                        height: '16px',
                                                        borderRadius: '20px',
                                                        background: enabled ? '#09090b' : '#e2e2e7',
                                                        position: 'relative',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '2px',
                                                        left: enabled ? '17px' : '2px',
                                                        width: '12px',
                                                        height: '12px',
                                                        borderRadius: '50%',
                                                        background: 'white',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    }} />
                                                </div>
                                                <span
                                                    onClick={() => toggleDay(dbDow, enabled)}
                                                    style={{ fontSize: '0.9375rem', fontWeight: 600, color: enabled ? '#09090b' : '#a1a1aa', cursor: 'pointer', userSelect: 'none', minWidth: '40px' }}
                                                >
                                                    {label}
                                                </span>

                                                {enabled && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0 0.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', height: '30px', marginLeft: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>最後預約</span>
                                                        <div style={{ position: 'relative', width: '28px', height: '16px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={slots[0]?.is_open_last_booking_time || false}
                                                                id={`last-booking-toggle-${dbDow}`}
                                                                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                                                onChange={(e) => updateDayLastBooking(dbDow, { is_open_last_booking_time: e.target.checked })}
                                                            />
                                                            <label
                                                                htmlFor={`last-booking-toggle-${dbDow}`}
                                                                style={{
                                                                    display: 'block',
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    background: slots[0]?.is_open_last_booking_time ? '#09090b' : '#e2e2e7',
                                                                    borderRadius: '10px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    position: 'relative'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: '2px',
                                                                    left: '2px',
                                                                    width: '12px',
                                                                    height: '12px',
                                                                    background: 'white',
                                                                    borderRadius: '50%',
                                                                    transition: 'all 0.2s',
                                                                    transform: slots[0]?.is_open_last_booking_time ? 'translateX(12px)' : 'translateX(0)'
                                                                }} />
                                                            </label>
                                                        </div>
                                                        <select
                                                            disabled={!slots[0]?.is_open_last_booking_time}
                                                            value={slots[0]?.last_booking_time || '17:00'}
                                                            onChange={(e) => updateDayLastBooking(dbDow, { last_booking_time: e.target.value })}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                fontSize: '0.8125rem',
                                                                color: slots[0]?.is_open_last_booking_time ? '#09090b' : '#a1a1aa',
                                                                fontWeight: 600,
                                                                outline: 'none',
                                                                width: '60px',
                                                                padding: 0
                                                            }}
                                                        >
                                                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => addSlot(dbDow)}
                                                style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e2e7', background: 'white', color: '#18181b', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}
                                            >
                                                <Plus size={14} /> 增加
                                            </button>
                                        </div>

                                        {enabled && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 40px', gap: '0.75rem', paddingLeft: '0.25rem' }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 600 }}>時間範圍</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 600 }}>座位數</span>
                                                </div>

                                                {slots.map((slot) => (
                                                    <div key={slot.uid} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 40px', gap: '0.75rem', alignItems: 'center' }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            background: '#ffffff',
                                                            borderRadius: '0.75rem',
                                                            padding: '0 1rem',
                                                            border: '1px solid #e2e2e7',
                                                            height: '34px',
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', gap: '0.75rem' }}>
                                                                <select
                                                                    value={slot.time_range.split('-')[0] || '09:00'}
                                                                    onChange={(e) => {
                                                                        const parts = slot.time_range.split('-');
                                                                        const end = parts.length > 1 ? parts[1] : '18:00';
                                                                        updateSlot(slot.uid, 'time_range', `${e.target.value}-${end}`);
                                                                    }}
                                                                    style={{ background: 'transparent', border: 'none', fontSize: '0.9375rem', color: '#09090b', fontWeight: 500, outline: 'none', appearance: 'none', textAlign: 'center' }}
                                                                >
                                                                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                                                </select>
                                                                <span style={{ color: '#cbd5e1' }}>→</span>
                                                                <select
                                                                    value={slot.time_range.split('-')[1] || '18:00'}
                                                                    onChange={(e) => {
                                                                        const parts = slot.time_range.split('-');
                                                                        const start = parts.length > 0 ? parts[0] : '09:00';
                                                                        updateSlot(slot.uid, 'time_range', `${start}-${e.target.value}`);
                                                                    }}
                                                                    style={{ background: 'transparent', border: 'none', fontSize: '0.9375rem', color: '#09090b', fontWeight: 500, outline: 'none', appearance: 'none', textAlign: 'center' }}
                                                                >
                                                                    {END_TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div style={{ position: 'relative' }}>
                                                            <Users size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={slot.max_capacity}
                                                                onChange={(e) => updateSlot(slot.uid, 'max_capacity', Number(e.target.value))}
                                                                style={{ paddingLeft: '2.25rem', height: '34px', width: '100%', borderRadius: '0.75rem', border: '1px solid #e2e2e7', fontSize: '0.9375rem', fontWeight: 500 }}
                                                            />
                                                        </div>

                                                        <button
                                                            onClick={() => removeSlot(slot.uid)}
                                                            style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', background: '#fff5f2', border: '1px solid #fee2e2', borderRadius: '0.75rem', padding: 0 }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Special Overrides */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="admin-card" style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#09090b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={14} /> 特別日期覆寫
                            </h3>
                            <button
                                onClick={openAddModal}
                                style={{ padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid #e2e2e7', background: 'white', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                                <Plus size={14} /> 新增
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {overrides.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#a1a1aa', fontSize: '0.75rem', background: '#fcfcfc', borderRadius: '0.5rem', border: '1px dashed #e2e2e7' }}>
                                    尚無特別日期設定
                                </div>
                            ) : (
                                overrides.map(o => (
                                    <div key={o.uid} style={{ padding: '0.625rem', background: o.is_closed ? '#fafafa' : 'white', border: '1px solid #e2e2e7', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: o.is_closed ? '#a1a1aa' : '#09090b' }}>{formatDateForInput(o.override_date)}</div>
                                                {!!o.is_closed && (
                                                    <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: 700 }}>休息</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                {!o.is_closed && (
                                                    <>
                                                        <Clock size={12} strokeWidth={2.5} />{o.override_time}
                                                        <span style={{ color: '#e2e2e7' }}>|</span>
                                                        <Users size={12} strokeWidth={2.5} /> {o.max_capacity}
                                                    </>
                                                )}

                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button
                                                onClick={() => openEditModal(o)}
                                                style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5', color: '#71717a', border: 'none', borderRadius: '0.375rem' }}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => deleteOverride(o.uid)}
                                                style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff5f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '0.375rem' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Overide Dialog */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="animate-in" style={{ background: 'white', width: '320px', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                            {editingOverride ? '編輯特別日期' : '新增特別日期'}
                        </h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const start = formData.get('start') as string;
                            const end = formData.get('end') as string;

                            saveOverride({
                                override_date: formData.get('date') as string,
                                override_time: `${start}-${end}`,
                                max_capacity: Number(formData.get('capacity')),
                                is_closed: tempIsClosed,
                            });
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>本日公休</span>
                                    <div style={{ position: 'relative', width: '36px', height: '20px' }}>
                                        <input
                                            name="is_closed"
                                            type="checkbox"
                                            checked={tempIsClosed}
                                            style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                            id="override-closed-toggle"
                                            onChange={(e) => setTempIsClosed(e.target.checked)}
                                        />
                                        <label
                                            htmlFor="override-closed-toggle"
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                height: '100%',
                                                background: tempIsClosed ? '#ef4444' : '#e2e2e7',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{
                                                position: 'absolute',
                                                top: '2px',
                                                left: '2px',
                                                width: '16px',
                                                height: '16px',
                                                background: 'white',
                                                borderRadius: '50%',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                transition: 'all 0.2s',
                                                transform: tempIsClosed ? 'translateX(16px)' : 'translateX(0)'
                                            }} />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#71717a', marginBottom: '0.25rem' }}>日期</label>
                                    <input name="date" type="date" required defaultValue={editingOverride ? formatDateForInput(editingOverride.override_date) : ''} style={{ width: '100%', height: '36px' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', opacity: tempIsClosed ? 0.5 : 1, pointerEvents: tempIsClosed ? 'none' : 'auto' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#71717a', marginBottom: '0.25rem' }}>開始時間</label>
                                        <select name="start" defaultValue={editingOverride?.override_time.split('-')[0] || '09:00'} style={{ width: '100%', height: '36px' }}>
                                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#71717a', marginBottom: '0.25rem' }}>結束時間</label>
                                        <select name="end" defaultValue={editingOverride?.override_time.split('-')[1] || '18:00'} style={{ width: '100%', height: '36px' }}>
                                            {END_TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ opacity: tempIsClosed ? 0.5 : 1, pointerEvents: tempIsClosed ? 'none' : 'auto' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#71717a', marginBottom: '0.25rem' }}>座位數</label>
                                    <input name="capacity" type="number" min={1} required={!tempIsClosed} defaultValue={editingOverride?.max_capacity || 2} style={{ width: '100%', height: '36px' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                                <button type="button" disabled={isSavingOverride} onClick={() => setIsModalOpen(false)} style={{ flex: 1, background: '#f4f4f5', color: '#18181b', border: 'none' }}>取消</button>
                                <button type="submit" className="primary" disabled={isSavingOverride} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    {isSavingOverride && <Loader2 size={16} className="animate-spin" />}
                                    {isSavingOverride ? '儲存中' : '儲存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleTimeEdit;
