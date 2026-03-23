import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, ChevronRight, ChevronLeft, CheckCircle2, Loader2, Edit, ChevronDown, Check } from 'lucide-react';
import { callGasApi } from '../utils/database';
import type { EventData, ScheduleTime, ScheduleOverride, BookingCache } from '../types';
import { generateUid } from '../utils/id';
import { TIME_SLOT_INTERVAL } from '../utils/constants';



const formatDate = (date: Date | string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const Booking: React.FC = () => {
    const params = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryParams = new URLSearchParams(location.search);

    const fullUrlPath = params['*'] || '';
    const pathParts = fullUrlPath.split('/').filter(Boolean);
    const websiteNameFromUrl = pathParts[0] || '';
    const dynamicUrlFromUrl = pathParts[1] || '';
    const scheduleMenuUid = searchParams.get('schedule_menu_uid');
    const lineUidFromUrl = queryParams.get('line_uid');

    // ── State ──────────────────────────────────────────────────────────────────
    const [step, setStep] = useState(1); // 1: Info, 2: Date/Time, 3: Success
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        selectedService: null as any,
    });
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
    const [isFirstStepAttempted, setIsFirstStepAttempted] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [slotTime, setSlotTime] = useState("");

    // ── Cache Logic ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const cached = localStorage.getItem('booking_user_cache');
        if (cached) {
            try {
                const { name, phone, email } = JSON.parse(cached);
                setFormData(prev => ({
                    ...prev,
                    name: name || prev.name,
                    phone: phone || prev.phone,
                    email: email || prev.email,
                }));
            } catch (e) {
                console.error("Failed to parse user cache", e);
            }
        }
    }, []);

    useEffect(() => {
        const cacheData = {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
        };
        localStorage.setItem('booking_user_cache', JSON.stringify(cacheData));
    }, [formData.name, formData.phone, formData.email]);

    // ── Validation ─────────────────────────────────────────────────────────────
    const isPhoneValid = useMemo(() => {
        if (!formData.phone) return true;
        const cleanPhone = formData.phone.replace(/[- ]/g, '');
        return /^09\d{8}$/.test(cleanPhone);
    }, [formData.phone]);

    const isEmailValid = useMemo(() => {
        if (!formData.email) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    }, [formData.email]);

    // ── Queries ────────────────────────────────────────────────────────────────

    const { data: memberEventInfo, isLoading: isEventLoading } = useQuery({
        queryKey: ['booking_member_event', lineUidFromUrl, dynamicUrlFromUrl, websiteNameFromUrl, scheduleMenuUid],
        queryFn: async () => {
            const res = await callGasApi<any>({
                action: 'call',
                procedure: 'getMemberEventInfo',
                params: [lineUidFromUrl || '', dynamicUrlFromUrl || '', websiteNameFromUrl || '', scheduleMenuUid || '']
            });
            return res || null;
        },
        enabled: !!websiteNameFromUrl && !!dynamicUrlFromUrl
    });

    const event = memberEventInfo?.event as EventData | null | undefined;
    const scheduleData = memberEventInfo ? {
        times: (memberEventInfo.schedule_time || []) as ScheduleTime[],
        overrides: (memberEventInfo.schedule_override || []) as ScheduleOverride[]
    } : undefined;
    const bookingCache = (memberEventInfo?.booking_cache || []) as BookingCache[];

    useEffect(() => {
        console.log(memberEventInfo);
        console.log(event);
        if (memberEventInfo && memberEventInfo.is_member === false) {
            navigate('/register', {
                state: {
                    line_uid: lineUidFromUrl,
                    manager_uid: event?.manager_uid,
                    questionnaire: memberEventInfo.questionnaire,
                    return_url: location.pathname + location.search
                },
                replace: true
            });
        }
    }, [memberEventInfo, lineUidFromUrl, navigate, location.pathname, location.search]);

    // 這裡要注意：目前的 executeSQL 回傳的是陣列，若是 INSERT 則由後端 GAS 處理
    // 為了保險起見，我們改用 executeNonQuery (如果後端有支援)
    const handleConfirmBooking = async () => {
        if (!event || !selectedDate || !selectedTimeSlot || !formData.selectedService) return;

        const bookingUid = generateUid();
        const computedDuration = Math.ceil(Number(formData.selectedService.duration) / 30) * 30; // 單位30分鐘
        const dateStr = formatDate(selectedDate);
        const startTimePart = selectedTimeSlot.split('_')[1];
        const startDateTime = `${dateStr} ${startTimePart}`;
        const startMinutes = timeToMinutes(startTimePart);
        const endMinutes = startMinutes + computedDuration;
        const endDateTime = `${dateStr} ${minutesToTime(endMinutes)}`;
        const allDaySlots = getAvailableSlots(selectedDate);
        const max_capacity_array: number[] = [];
        for (let time = startMinutes; time < endMinutes; time += 30) {
            const timeStr = minutesToTime(time);
            const slot = allDaySlots.find(s => s.uid === `${dateStr}_${timeStr}`);
            if (slot) max_capacity_array.push(slot.max_capacity);
        }

        const bookingData = {
            uid: bookingUid,
            line_uid: lineUidFromUrl,
            name: formData.name,
            phone: formData.phone,
            booking_start_time: startDateTime,
            booking_end_time: endDateTime,
            service_item: formData.selectedService.title,
            service_computed_duration: computedDuration,
            manager_uid: event.manager_uid,
            time_slot_interval: TIME_SLOT_INTERVAL,
            max_capacity_array
        };
        setSlotTime(`${startTimePart}-${minutesToTime(endMinutes)} (${computedDuration}分鐘)`);
        setIsSubmitting(true);
        try {
            const result = await callGasApi({
                action: "call",
                procedure: "submitBooking",
                params: [JSON.stringify(bookingData)]
            });

            if (result && (result.success || result.result?.success)) {
                setStep(3); // 成功後才切換
            } else {
                alert((result?.message || result?.result?.message) || "預約失敗，請檢查網路連線或稍後再試。");
            }
        } catch (error) {
            console.error("Booking Submit Failed:", error);
            alert("預約失敗，請稍後再試。");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Calculation ─────────────────────────────────────────────────────────────

    const timeToMinutes = (t: string) => {
        if (!t) return 0;
        const [h, m] = t.trim().split(':').map(Number);
        return h * 60 + (m || 0);
    };

    const minutesToTime = (m: number) => {
        const h = Math.floor(m / 60);
        const mm = m % 60;
        return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };

    const eventOptions = useMemo(() => {
        if (!event?.options) return { name: '', items: [] };
        try { return JSON.parse(event.options); } catch { return { name: '', items: [] }; }
    }, [event]);

    const getAvailableSlots = (date: Date) => {
        if (!scheduleData) return [];
        const dateStr = formatDate(date);
        console.log("getAvailableSlots", scheduleData);


        // 1. 取得該日適用的規則 (Override 優先)
        const dayOverrides = scheduleData.overrides.filter(o => {
            return formatDate(new Date(o.override_date)) === dateStr
        });
        console.log("getAvailableSlots dayOverrides", dayOverrides);
        let activeRules: { start: number, end: number, cap: number, last: number }[] = [];

        if (dayOverrides.length > 0) {
            // 使用 Override 規則
            activeRules = dayOverrides.filter(o => !o.is_closed).map(o => {
                const times = o.override_time.split('-').map(s => s.trim());
                const s = timeToMinutes(times[0]);
                const e = timeToMinutes(times[1]);
                return { start: s, end: e, cap: o.max_capacity, last: e };
            });
        } else {
            // 使用常規週營業時間
            let dow = date.getDay();

            if (dow === 0) dow = 7;
            activeRules = scheduleData.times
                .filter(t => t.day_of_week === dow && (String(t.is_open) === 'true' || t.is_open === true || Number(t.is_open) === 1))
                .map(t => {
                    const times = t.time_range.split('-').map(s => s.trim());
                    const s = timeToMinutes(times[0]);
                    const e = timeToMinutes(times[1]);
                    const last = (String(t.is_open_last_booking_time) === 'true' || t.is_open_last_booking_time === true || Number(t.is_open_last_booking_time) === 1)
                        ? timeToMinutes(t.last_booking_time) : e;
                    return { start: s, end: e, cap: t.max_capacity, last: last };
                });
        }

        if (activeRules.length === 0) return [];

        // 2. 進行時段切分與容量合併 (每 30 分鐘一格)
        const rawSlots: { uid: string, time_range: string, max_capacity: number, available_capacity: number, start_minutes: number }[] = [];

        // 從最早開始到最晚結束
        const minStart = Math.min(...activeRules.map(r => r.start));
        const maxEnd = Math.max(...activeRules.map(r => r.end));

        for (let time = minStart; time + 30 <= maxEnd; time += 30) {
            let bestCap = -1;

            for (const rule of activeRules) {
                // 條件：在規則時間內 且 該時段起點不晚於最後預約時間
                if (time >= rule.start && (time + 30) <= rule.end && time <= rule.last) {
                    if (rule.cap > bestCap) {
                        bestCap = rule.cap;
                    }
                }
            }

            if (bestCap > 0) {
                const slotStartStr = `${dateStr} ${minutesToTime(time)}`;
                // 找尋 bookingCache 中有沒有這個起點時間的紀錄，因為 GAS 可能回傳結尾多了 :00 或沒有，作模糊比對

                const cached = bookingCache.find(bc => bc.booking_start_time.startsWith(slotStartStr));
                const bookedCount = cached ? Number(cached.booked_count) : 0;
                const available = bestCap - bookedCount;
                if (available > 0) {
                    rawSlots.push({
                        uid: `${dateStr}_${minutesToTime(time)}`,
                        time_range: `${minutesToTime(time)}-${minutesToTime(time + 30)}`,
                        max_capacity: bestCap,
                        available_capacity: available,
                        start_minutes: time
                    });
                }
            }
        }

        // 3. 確保連續時段：如果服務需要跨越多個 30 分鐘方塊，檢查後續的時段是否也都可用
        const serviceDuration = formData.selectedService ? Number(formData.selectedService.duration) : 30;
        const requiredBlocks = Math.ceil(serviceDuration / 30);

        const validSlots = [];
        for (let i = 0; i < rawSlots.length; i++) {
            let isValid = true;
            for (let j = 0; j < requiredBlocks; j++) {
                const targetBlock = rawSlots[i + j];
                // 如果沒有後繼時段（跨越下班時間）或時段不連續（中間卡到午休/已經客滿被拔除）
                if (!targetBlock || targetBlock.start_minutes !== (rawSlots[i].start_minutes + j * 30)) {
                    isValid = false;
                    break;
                }
            }
            if (isValid) {
                validSlots.push({
                    uid: rawSlots[i].uid,
                    time_range: rawSlots[i].time_range,
                    max_capacity: rawSlots[i].max_capacity,
                    available_capacity: rawSlots[i].available_capacity
                });
            }
        }

        console.log(`Generated ${validSlots.length} valid slots for ${dateStr} (Service: ${serviceDuration}m)`, validSlots);
        return validSlots;
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    if (isEventLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                    <p style={{ color: '#94a3b8', fontWeight: 500 }}>正在開啟預約門扉...</p>
                </div>
            </div>
        );
    }

    if (memberEventInfo?.is_member === false) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                    <p style={{ color: '#94a3b8', fontWeight: 500 }}>正在前往註冊頁面...</p>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '3rem', borderRadius: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: '#1e293b' }}>網址已失效或不存在</h1>
                    <p style={{ color: '#64748b', maxWidth: '300px' }}>請聯繫服務商家獲取最新的預約連結。</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
            {/* Background Ornaments */}
            <div style={{ position: 'absolute', top: -100, right: -100, width: '40vw', height: '40vw', background: 'radial-gradient(circle, var(--primary-soft) 0%, transparent 70%)', zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: -50, left: -50, width: '30vw', height: '30vw', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 70%)', zIndex: 0 }} />

            <div className={`booking-layout-container`} style={{ maxWidth: (step === 1 || step === 2) ? '1000px' : '520px' }}>
                {/* Header */}
                <header style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    position: 'sticky',
                    top: '0.75rem',
                    zIndex: 50,
                    margin: '0.75rem -1rem 1.25rem -1rem',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.006)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', overflow: 'hidden', flexShrink: 0 }}>
                            {event.logo_url ? <img src={`/logo/${event.logo_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Logo" /> : <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{event.title[0]}</div>}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <h1 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{event.title}</h1>
                        </div>
                    </div>
                </header>

                <div style={{ padding: '1rem' }}>
                    {/* Step Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                        {[1, 2, 3].map((s) => (
                            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    background: step === s ? 'var(--primary-gradient)' : step > s ? '#22c55e' : '#fff',
                                    color: step >= s ? '#fff' : '#cbd5e1',
                                    boxShadow: step === s ? '0 6px 15px -4px rgba(99, 102, 241, 0.4)' : 'none',
                                    border: step >= s ? 'none' : '2px solid #e2e8f0',
                                    zIndex: 2
                                }}>
                                    {step > s ? <CheckCircle2 size={16} /> : s}
                                </div>
                                {s < 3 && (
                                    <div className="step-indicator-line" style={{
                                        position: 'absolute',
                                        left: '28px',
                                        width: 'calc((1000px / 3) - 80px)',
                                        maxWidth: '200px',
                                        height: '2px',
                                        background: step > s ? '#22c55e' : '#e2e8f0',
                                        top: '100%',
                                        transform: 'translateY(-50%)',
                                        zIndex: 1
                                    }} />
                                )}
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: step >= s ? '#1e293b' : '#94a3b8' }}>
                                    {s === 1 ? '基本資訊' : s === 2 ? '選擇時間' : '預約成功'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <section style={{
                                background: 'white',
                                padding: '1.25rem',
                                borderRadius: '1.25rem',
                                border: '1px solid rgba(226, 232, 240, 0.8)',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)'
                            }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '2rem'
                                }}>
                                    {/* Left: Description */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>活動介紹</h2>
                                        <div style={{
                                            padding: '0.3rem',
                                            color: '#475569',
                                            lineHeight: 1.5,
                                            fontSize: '0.9rem',
                                            whiteSpace: 'pre-wrap',
                                        }}>
                                            {event.description || '暫無活動說明'}
                                        </div>
                                    </div>

                                    {/* Right: Form */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>您的聯絡資訊</h2>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            {[
                                                { label: '姓名', id: 'name', icon: User, placeholder: '怎麼稱呼您？', required: true },
                                                { label: '電話', id: 'phone', icon: Phone, placeholder: '09XX-XXX-XXX', required: event.is_phone_required, type: 'tel' },
                                                { label: '信箱', id: 'email', icon: Mail, placeholder: 'example@email.com', required: event.is_email_required, type: 'email' }
                                            ].map((field) => (

                                                field.required && (
                                                    <div key={field.id}>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', marginLeft: '0.2rem' }}>{field.label}*</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <div style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', zIndex: 1 }}>
                                                                <field.icon size={16} />
                                                            </div>
                                                            <input
                                                                type={field.type || 'text'}
                                                                value={(formData as any)[field.id]}
                                                                onChange={e => setFormData(p => ({ ...p, [field.id]: e.target.value }))}
                                                                placeholder={field.placeholder}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.75rem 1rem 0.75rem 2.4rem',
                                                                    background: '#f8fafc',
                                                                    border: '2px solid',
                                                                    borderColor: (
                                                                        (isFirstStepAttempted && field.required && !(formData as any)[field.id]) ||
                                                                        (field.id === 'phone' && !isPhoneValid && formData.phone) ||
                                                                        (field.id === 'email' && !isEmailValid && formData.email)
                                                                    ) ? '#ef4444' : '#e2e8f0',
                                                                    borderRadius: '0.8rem',
                                                                    fontSize: '0.9rem',
                                                                    transition: 'all 0.2s',
                                                                    outline: 'none',
                                                                    boxShadow: 'none'
                                                                }}
                                                            />
                                                        </div>
                                                        {isFirstStepAttempted && field.required && !(formData as any)[field.id] && (
                                                            <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '0.3rem', marginLeft: '0.4rem', fontWeight: 600 }}>這是必填欄位</p>
                                                        )}
                                                        {field.id === 'phone' && !isPhoneValid && formData.phone && (
                                                            <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '0.3rem', marginLeft: '0.4rem', fontWeight: 600 }}>請輸入正確的台灣手機格式 (09XXXXXXXX)</p>
                                                        )}
                                                        {field.id === 'email' && !isEmailValid && formData.email && (
                                                            <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '0.3rem', marginLeft: '0.4rem', fontWeight: 600 }}>請輸入正確的 Email 格式</p>
                                                        )}
                                                    </div>
                                                )
                                            ))}

                                            {/* Service Selection */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', marginLeft: '0.2rem' }}>選擇服務項目*</label>
                                                <div style={{ position: 'relative' }}>
                                                    <button
                                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem 1rem',
                                                            background: '#f8fafc',
                                                            border: '2px solid',
                                                            borderColor: (isFirstStepAttempted && !formData.selectedService) ? '#ef4444' : (isDropdownOpen ? 'var(--primary)' : '#e2e8f0'),
                                                            borderRadius: '0.8rem',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            textAlign: 'left'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                            <Edit size={16} style={{ color: (isFirstStepAttempted && !formData.selectedService) ? '#ef4444' : '#cbd5e1' }} />
                                                            <div>
                                                                {formData.selectedService ? (
                                                                    <>
                                                                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{formData.selectedService.title}</span>
                                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '0.4rem' }}>({formData.selectedService.duration} 分鐘)</span>
                                                                    </>
                                                                ) : (
                                                                    <span style={{ color: (isFirstStepAttempted && !formData.selectedService) ? '#ef4444' : '#94a3b8', fontWeight: 500, fontSize: '0.9rem' }}>點擊選擇服務項目...</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ChevronDown size={18} style={{ color: (isFirstStepAttempted && !formData.selectedService) ? '#ef4444' : (isDropdownOpen ? 'var(--primary)' : '#cbd5e1'), transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                                                    </button>
                                                    {isFirstStepAttempted && !formData.selectedService && (
                                                        <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '0.3rem', marginLeft: '0.4rem', fontWeight: 600 }}>請選擇一個服務項目</p>
                                                    )}

                                                    {isDropdownOpen && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 'calc(100% + 0.4rem)',
                                                            left: 0,
                                                            right: 0,
                                                            background: '#fff',
                                                            borderRadius: '1rem',
                                                            border: '1px solid #e2e8f0',
                                                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                                                            zIndex: 100,
                                                            maxHeight: '260px',
                                                            overflowY: 'auto',
                                                            padding: '0.4rem'
                                                        }} className="dropdown-animate">
                                                            {eventOptions.items.map((item: any, idx: number) => (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        setFormData(p => ({ ...p, selectedService: item }));
                                                                        setIsDropdownOpen(false);
                                                                    }}
                                                                    style={{
                                                                        padding: '0.4rem',
                                                                        borderRadius: '0.6rem',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        background: formData.selectedService === item ? 'var(--primary-soft)' : 'transparent',
                                                                        transition: 'background 0.2s'
                                                                    }}
                                                                >
                                                                    <div>
                                                                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: formData.selectedService === item ? 'var(--primary)' : '#334155' }}>{item.title}</div>
                                                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.duration} 分鐘</div>
                                                                    </div>
                                                                    {formData.selectedService === item && <Check size={14} style={{ color: 'var(--primary)' }} />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <button
                                onClick={() => {
                                    setIsFirstStepAttempted(true);

                                    const isNameValid = !!formData.name;
                                    const isServiceValid = !!formData.selectedService;
                                    const isPhoneOk = event.is_phone_required ? (!!formData.phone && isPhoneValid) : (!!formData.phone ? isPhoneValid : true);
                                    const isEmailOk = event.is_email_required ? (!!formData.email && isEmailValid) : (!!formData.email ? isEmailValid : true);

                                    if (isNameValid && isServiceValid && isPhoneOk && isEmailOk) {
                                        setStep(2);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem',
                                    background: 'var(--primary-gradient)',
                                    color: 'white',
                                    borderRadius: '0.9rem',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    boxShadow: '0 8px 20px -5px rgba(99, 102, 241, 0.4)',
                                    transition: 'all 0.3s',
                                    marginTop: '0.5rem'
                                }}
                            >
                                繼續選擇時間 <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="responsive-grid" style={{ gap: '1.25rem' }}>
                                {/* Left: Calendar */}
                                <section style={{
                                    background: 'white',
                                    padding: '1.25rem',
                                    borderRadius: '1.5rem',
                                    border: '1px solid rgba(226, 232, 240, 0.8)',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                                }}>
                                    <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        <CalendarIcon size={18} /> 選擇日期
                                    </h2>
                                    <SimpleCalendar selected={selectedDate} onSelect={setSelectedDate} />
                                </section>

                                {/* Right: Time Slots */}
                                <section style={{
                                    background: 'white',
                                    padding: '1.25rem',
                                    borderRadius: '1.5rem',
                                    border: '1px solid rgba(226, 232, 240, 0.8)',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        <Clock size={18} /> 選擇時段
                                    </h2>

                                    {selectedDate ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.6rem' }}>
                                            {getAvailableSlots(selectedDate).map((slot, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedTimeSlot(slot.uid)}
                                                    style={{
                                                        padding: '0.625rem 0.5rem',
                                                        borderRadius: '0.9rem',
                                                        border: '2px solid',
                                                        borderColor: selectedTimeSlot === slot.uid ? 'var(--primary)' : '#f1f5f9',
                                                        background: selectedTimeSlot === slot.uid ? 'var(--primary-soft)' : '#fff',
                                                        color: selectedTimeSlot === slot.uid ? 'var(--primary)' : '#475569',
                                                        transition: 'all 0.2s',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '0.125rem'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>{slot.time_range}</span>
                                                    <span style={{
                                                        fontSize: '0.775rem',
                                                        fontWeight: 600,
                                                        color: 'green',
                                                        opacity: 0.8
                                                    }}>
                                                        餘 {slot.available_capacity} 位
                                                    </span>
                                                </button>
                                            ))}
                                            {getAvailableSlots(selectedDate).length === 0 && (
                                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                                    今日暫無開放時段
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.875rem', padding: '2rem' }}>
                                            請先選擇預約日期
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* Navigation */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={() => setStep(1)}
                                    style={{
                                        flex: 1,
                                        padding: '0.875rem',
                                        background: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '1rem',
                                        color: '#64748b',
                                        fontWeight: 600,
                                        fontSize: '0.95rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.4rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <ChevronLeft size={18} /> 上一步
                                </button>
                                <button
                                    disabled={!selectedDate || !selectedTimeSlot || isSubmitting}
                                    onClick={handleConfirmBooking}
                                    style={{
                                        flex: 2,
                                        padding: '0.875rem',
                                        background: (!selectedDate || !selectedTimeSlot || isSubmitting) ? '#cbd5e1' : 'var(--primary-gradient)',
                                        borderRadius: '1rem',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.4rem',
                                        boxShadow: (!selectedDate || !selectedTimeSlot || isSubmitting) ? 'none' : '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                                        transition: 'all 0.3s',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" /> 處理中...
                                        </>
                                    ) : (
                                        <>
                                            確認預約 <CheckCircle2 size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in" style={{ textAlign: 'center', padding: '1rem' }}>
                            <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                <div style={{ width: '72px', height: '72px', background: '#dcfce7', color: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <CheckCircle2 size={40} />
                                </div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>預約成功！</h1>
                                <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.6 }}>
                                    我們已收到您的預約申請。<br />
                                    稍後會發送確認資訊至您的聯絡方式。
                                </p>
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1.25rem', textAlign: 'left', marginBottom: '2rem' }}>
                                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.875rem' }}>預約明細</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>服務項目</span>
                                            <span style={{ color: '#0f172a', fontWeight: 700 }}>{formData.selectedService?.title}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>日期</span>
                                            <span style={{ color: '#0f172a', fontWeight: 700 }}>{selectedDate ? formatDate(selectedDate) : ''}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>時段</span>
                                            <span style={{ color: '#0f172a', fontWeight: 700 }}>{slotTime}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.location.reload()}
                                    style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9375rem', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    繼續預約
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SimpleCalendar: React.FC<{ selected: Date | null, onSelect: (d: Date) => void }> = ({ selected, onSelect }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [viewDate, setViewDate] = useState(new Date(selected || today));

    const weeks = ['日', '一', '二', '三', '四', '五', '六'];
    const days: Date[] = [];

    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const startOffset = startOfMonth.getDay();
    const totalDays = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

    for (let i = 0; i < totalDays; i++) {
        days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1));
    }

    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    return (
        <div style={{ userSelect: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 800, color: '#1e293b' }}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={prevMonth} style={{ padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'none' }}><ChevronLeft size={16} /></button>
                    <button onClick={nextMonth} style={{ padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'none' }}><ChevronRight size={16} /></button>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', textAlign: 'center' }}>
                {weeks.map(w => <div key={w} style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, paddingBottom: '0.5rem' }}>{w}</div>)}
                {Array(startOffset).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                {days.map(date => {
                    const isSelected = selected && date.getTime() === selected.getTime();
                    const isToday = date.getTime() === today.getTime();
                    const isPast = date < today;

                    return (
                        <div
                            key={date.toISOString()}
                            onClick={() => !isPast && onSelect(new Date(date))}
                            style={{
                                padding: '0.6rem 0',
                                borderRadius: '0.6rem',
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                cursor: isPast ? 'not-allowed' : 'pointer',
                                background: isSelected ? 'var(--primary-gradient)' : 'none',
                                color: isSelected ? '#fff' : isPast ? '#e2e8f0' : isToday ? 'var(--primary)' : '#475569',
                                position: 'relative'
                            }}
                        >
                            {date.getDate()}
                            {isToday && !isSelected && <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', background: 'var(--primary)', borderRadius: '50%' }} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Booking;
