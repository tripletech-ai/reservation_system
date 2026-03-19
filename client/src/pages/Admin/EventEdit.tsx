import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, Plus, Trash2, X, Clock, Mail, Phone, FileText, List, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callGasApi } from '../../utils/database';
import { useAuth } from '../../utils/auth';
import { QUERY_CONFIG } from '../../utils/constants';
import type { EventData } from '../../types';
import { generateUid } from '../../utils/id';

const EventEdit: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const queryClient = useQueryClient();
    const { manager } = useAuth();

    // 狀態設定
    const [eventState, setEventState] = useState({
        title: '',
        description: '',
        is_email_required: false,
        is_phone_required: true,
        booking_dynamic_url: '',
        website_name: '',
        options: {
            name: '', // 服務選單分類名稱 (例如: 專業按摩服務)
            items: [] as { title: string, duration: number }[] // 具體項目
        },
        schedule_menu_uid: [] as { uid: string }[]
    });

    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
    const [tempOptions, setTempOptions] = useState(eventState.options);

    // 開啟彈窗時同步暫存狀態
    const openOptionModal = () => {
        setTempOptions(JSON.parse(JSON.stringify(eventState.options)));
        setIsOptionModalOpen(true);
    };

    // 完成設定時同步至主狀態
    const saveOptions = () => {
        // 1. 驗證選單分類名稱
        if (!tempOptions.name.trim()) {
            alert('請輸入「選單分類名稱」（例如：專業按摩服務）。');
            return;
        }

        // 2. 驗證項目數量
        if (tempOptions.items.length === 0) {
            alert('請至少新增一個服務項目。');
            return;
        }

        // 3. 驗證每個項目的內容
        for (let i = 0; i < tempOptions.items.length; i++) {
            const item = tempOptions.items[i];
            if (!item.title.trim()) {
                alert(`第 ${i + 1} 個項目的名稱不可為空。`);
                return;
            }
            if (item.duration <= 0) {
                alert(`項目「${item.title}」的時間必須大於 0 分鐘。`);
                return;
            }
        }

        setEventState(prev => ({ ...prev, options: tempOptions }));
        setIsOptionModalOpen(false);
    };

    // 取得現有資料 (如果是編輯模式)
    const { data: dbEvent, isLoading, isFetching } = useQuery({
        queryKey: ['event', id],
        queryFn: async () => {
            if (id === 'new') return null;
            const result = await callGasApi<EventData[]>({
                action: "select",
                table: 'event',
                where: `uid = '${id}' LIMIT 1`
            });
            return result?.[0] || null;
        },
        enabled: id !== 'new',
        staleTime: QUERY_CONFIG.LONG_STALE_TIME,
        refetchOnWindowFocus: false,
    });

    // 取得該管理員的所有營業時間選單
    const { data: scheduleMenus = [], isLoading: isSchedulesLoading, isFetching: isSchedulesFetching } = useQuery({
        queryKey: ['schedule_menus', manager?.uid],
        queryFn: async () => {
            if (!manager?.uid) return [];
            return await callGasApi<any[]>({
                action: "select",
                table: 'schedule_menu',
                where: `manager_uid = '${manager.uid}'`
            }) || [];
        },
        enabled: !!manager?.uid,
    });

    // 當資料抓到時，初始化編輯狀態
    useEffect(() => {
        if (dbEvent) {
            setEventState({
                title: dbEvent.title,
                description: dbEvent.description,
                is_email_required: dbEvent.is_email_required,
                is_phone_required: dbEvent.is_phone_required,
                website_name: manager?.website_name || '',
                booking_dynamic_url: dbEvent.booking_dynamic_url || '',
                options: dbEvent.options ? JSON.parse(dbEvent.options) : { name: '', items: [] },
                schedule_menu_uid: dbEvent.schedule_menu_uid ? JSON.parse(dbEvent.schedule_menu_uid) : []
            });
        }
    }, [dbEvent]);

    // 儲存 Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const uid = id === 'new' ? generateUid() : id;
            const menuJson = JSON.stringify(eventState.options);
            const hoursJson = JSON.stringify(eventState.schedule_menu_uid);

            // 只有在編輯模式時檢查是否真的有變動
            if (id !== 'new' && dbEvent) {
                const hasChanged =
                    eventState.title !== dbEvent.title ||
                    eventState.description !== dbEvent.description ||
                    eventState.is_phone_required !== dbEvent.is_phone_required ||
                    eventState.is_email_required !== dbEvent.is_email_required ||
                    eventState.booking_dynamic_url !== (dbEvent.booking_dynamic_url || '') ||
                    menuJson !== dbEvent.options ||
                    hoursJson !== dbEvent.schedule_menu_uid;

                if (!hasChanged) {
                    console.log("No changes detected, skipping DB update.");
                    return 'NO_CHANGES';
                }
            }

            const now = new Date().toISOString();
            const data: any = {
                title: eventState.title,
                logo_url: manager?.logo_url,
                description: eventState.description,
                is_phone_required: eventState.is_phone_required,
                is_email_required: eventState.is_email_required,
                website_name: manager?.website_name,
                booking_dynamic_url: eventState.booking_dynamic_url,
                options: menuJson,
                schedule_menu_uid: hoursJson,
                update_at: now
            };

            let result;
            if (id === 'new') {
                data.uid = uid;
                data.manager_uid = manager?.uid;
                data.create_at = now;
                // 注意：這裡的路徑生成邏輯保持不變
                data.booking_dynamic_url = `/${manager?.website_name}/${eventState.booking_dynamic_url}`;
                result = await callGasApi({ action: "insert", table: "event", data });
            } else {
                result = await callGasApi({
                    action: "update",
                    table: "event",
                    where: `uid = '${id}'`,
                    data
                });
            }

            if (!result) throw new Error('儲存失敗');
            return 'UPDATED';
        },
        onSuccess: (result) => {
            if (result === 'NO_CHANGES') {
                navigate('/admin/event');
                return;
            }
            // 只有在真正有更新時才失效快取
            queryClient.invalidateQueries({ queryKey: ['events_and_menus'] });
            queryClient.invalidateQueries({ queryKey: ['event', id] });
            navigate('/admin/event');
        },
        onError: (err: any) => alert(err.message)
    });

    // 刪除處理 (編輯頁面新增)
    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!confirm('確定要刪除此活動嗎？此操作不可恢復。')) return;
            const result = await callGasApi({
                action: "delete",
                table: "event",
                where: `uid = '${id}'`
            });
            if (!result) throw new Error('刪除失敗');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events_and_menus'] });
            navigate('/admin/event');
        },
        onError: (err: any) => alert(err.message)
    });

    const addOption = () => {
        setTempOptions(prev => ({
            ...prev,
            items: [...prev.items, { title: '', duration: 60 }]
        }));
    };

    const removeOption = (idx: number) => {
        setTempOptions(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx)
        }));
    };

    const updateOption = (idx: number, field: string, value: any) => {
        setTempOptions(prev => {
            const newItems = [...prev.items];
            if (field === 'duration') {
                newItems[idx].duration = parseInt(value) || 0;
            } else {
                (newItems[idx] as any)[field] = value;
            }
            return { ...prev, items: newItems };
        });
    };

    const updateMenuName = (name: string) => {
        setTempOptions(prev => ({ ...prev, name }));
    };

    // 只有在完全沒有資料且正在初始讀取時才顯示全頁面遮罩
    if ((isLoading || isSchedulesLoading) && !dbEvent && scheduleMenus.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                    <p style={{ color: '#64748b', fontWeight: 500 }}>正在載入活動設定...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate('/admin/event')}
                    style={{ background: 'white', border: '1px solid #e2e8f0', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex' }}
                >
                    <ChevronLeft size={20} />
                </button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{id === 'new' ? '新增活動' : '編輯活動設定'}</h1>
                    {(isFetching || isSchedulesFetching) && (
                        <Loader2 className="animate-spin" size={20} color="#94a3b8" />
                    )}
                </div>
                {id !== 'new' && (
                    <button
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                        style={{
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#ef4444',
                            padding: '0 1rem',
                            height: '42px',
                            borderRadius: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {deleteMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} strokeWidth={2.5} />}
                        刪除活動
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* 基本資訊 */}
                    <div className="admin-card">
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="var(--primary)" /> 基本資訊
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#64748b' }}>活動名稱</label>
                                <input
                                    type="text"
                                    value={eventState.title}
                                    onChange={(e) => setEventState({ ...eventState, title: e.target.value })}
                                    style={{ width: '100%', color: '#1e293b', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                                    placeholder="請輸入活動名稱"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#64748b' }}>預約網址路徑 (Dynamic URL)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#64748b', border: '1px solid #e2e8f0' }}>/booking/{manager?.website_name}/</div>
                                    <input
                                        type="text"
                                        value={eventState.booking_dynamic_url}
                                        onChange={(e) => setEventState({ ...eventState, booking_dynamic_url: e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase() })}
                                        style={{ flex: 1, color: '#1e293b', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                                        placeholder="活動專屬路徑 (例如: massage-spa)"
                                    />
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.375rem' }}>※ 僅限英文字母、數字與連字號 (-)</p>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#64748b' }}>活動說明</label>
                                <textarea
                                    rows={4}
                                    value={eventState.description}
                                    onChange={(e) => setEventState({ ...eventState, description: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', color: '#1e293b', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0.5rem', outline: 'none' }}
                                    placeholder="請輸入活動詳細說明..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* 預約選項設定 (預覽與彈窗觸發) */}
                    <div className="admin-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <List size={20} color="var(--primary)" /> 預約服務項目
                            </h3>
                            <button
                                onClick={openOptionModal}
                                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', padding: '0.5rem 0.875rem' }}
                            >
                                <Plus size={16} /> 編輯選單
                            </button>
                        </div>

                        {eventState.options.name && (
                            <div style={{ marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-soft)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                                    {eventState.options.name}
                                </span>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                            {eventState.options.items.length === 0 ? (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #e2e8f0', color: '#94a3b8' }}>
                                    尚未設定服務項目
                                </div>
                            ) : (
                                eventState.options.items.map((item, idx) => (
                                    <div key={idx} style={{ padding: '0.75rem', background: 'white', border: '1px solid #f1f5f9', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.title}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.duration} min</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* 客戶資料欄位 */}
                    <div className="admin-card">
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>預約資料要求</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={eventState.is_email_required} onChange={(e) => setEventState({ ...eventState, is_email_required: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={18} color="#64748b" /> <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>要求填寫 Email</span>
                                </div>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={eventState.is_phone_required} onChange={(e) => setEventState({ ...eventState, is_phone_required: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Phone size={18} color="#64748b" /> <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>要求填寫 手機號碼</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* 選擇營業時間 */}
                    <div className="admin-card">
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={20} color="var(--primary)" /> 適用營業時間
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {scheduleMenus.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #e2e8f0', color: '#94a3b8', fontSize: '0.875rem' }}>
                                    尚未建立排程範本
                                </div>
                            ) : (
                                scheduleMenus.map((item: any) => {
                                    const val = item.uid;
                                    const isChecked = eventState.schedule_menu_uid.some((t: any) => t.uid === val);
                                    return (
                                        <label key={val} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            cursor: 'pointer',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            background: isChecked ? '#f0f9ff' : 'transparent',
                                            border: isChecked ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                                            transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    const current = eventState.schedule_menu_uid;
                                                    setEventState({
                                                        ...eventState,
                                                        schedule_menu_uid: e.target.checked
                                                            ? [...current, { uid: val }]
                                                            : current.filter((v: any) => v.uid !== val)
                                                    });
                                                }}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isChecked ? '#0369a1' : '#475569' }}>{item.name}</span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        style={{
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            fontWeight: 700,
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                            opacity: saveMutation.isPending ? 0.7 : 1,
                            cursor: saveMutation.isPending ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {saveMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {saveMutation.isPending ? '儲存中...' : '儲存活動設定'}
                    </button>
                </div>
            </div>

            {/* 預約服務項目編輯彈窗 */}
            {isOptionModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content animate-in" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <List size={22} color="var(--primary)" /> 編輯服務選單
                            </h3>
                            <button onClick={() => setIsOptionModalOpen(false)} style={{ background: 'transparent', padding: '0.25rem', color: '#94a3b8' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <div style={{ background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '0.75rem', marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem', marginLeft: '0.5rem' }}>選單分類名稱</label>
                                <input
                                    type="text"
                                    value={tempOptions.name}
                                    onChange={(e) => updateMenuName(e.target.value)}
                                    style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem', fontWeight: 600, fontSize: '1rem', outline: 'none' }}
                                    placeholder="例如: 專業按摩服務"
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>服務項目</span>
                                <button onClick={addOption} style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                                    <Plus size={14} /> 新增項目
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                {tempOptions.items.map((opt, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        alignItems: 'center',
                                        padding: '0.5rem',
                                        background: '#fff',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #f1f5f9'
                                    }}>
                                        <input
                                            type="text"
                                            required
                                            value={opt.title}
                                            onChange={(e) => updateOption(idx, 'title', e.target.value)}
                                            placeholder="項目名稱"
                                            style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.25rem', fontSize: '0.875rem' }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#f8fafc', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #f1f5f9' }}>
                                            <input
                                                type="number"
                                                required
                                                min={1}
                                                max={1440}
                                                value={opt.duration}
                                                onChange={(e) => updateOption(idx, 'duration', e.target.value)}
                                                style={{ width: '45px', border: 'none', background: 'transparent', padding: 0, textAlign: 'right', fontSize: '0.8125rem', fontWeight: 600 }}
                                            />
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>m</span>
                                        </div>
                                        <button
                                            onClick={() => removeOption(idx)}
                                            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eb8566ff', background: '#fff5f2', padding: 0 }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={saveOptions} className="primary" style={{ width: '100%' }}>完成設定</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventEdit;
