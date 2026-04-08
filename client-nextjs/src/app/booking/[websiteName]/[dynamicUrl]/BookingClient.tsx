'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Check
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { BookingClientProps, ScheduleSlotProps } from '@/types'
import { useAlert } from '@/components/ui/DialogProvider'
import { submitBooking } from '@/app/actions/bookings'
import { TIME_SLOT_INTERVAL } from '@/constants/common'
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'
import { TimeUtils } from '@/lib/TimeUtils'

dayjs.extend(utc);
const formatDate = (date: Date | string) => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const timeToMinutes = (t: string) => {
  if (!t) return 0
  const parts = t.trim().split(':').map(Number)
  const h = parts[0] || 0
  const m = parts[1] || 0
  return h * 60 + m
}

const minutesToTime = (m: number) => {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const SimpleCalendar: React.FC<{ selected: Date | null, onSelect: (d: Date) => void, limit: boolean }> = ({ selected, onSelect, limit }) => {
  const today = new Date()
  if (limit) {
    today.setHours(48, 0, 0, 0)
  } else {
    today.setHours(0, 0, 0, 0)
  }


  const [viewDate, setViewDate] = useState(new Date(selected || today))

  const weeks = ['日', '一', '二', '三', '四', '五', '六']
  const days: Date[] = []

  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const startOffset = startOfMonth.getDay()
  const totalDays = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()

  for (let i = 0; i < totalDays; i++) {
    days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1))
  }

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))

  return (
    <div className="select-none">
      <div className="flex justify-between items-center mb-4">
        <span className="font-extrabold text-slate-800">{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</span>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="text-black p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"><ChevronLeft size={16} /></button>
          <button onClick={nextMonth} className="text-black p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weeks.map(w => <div key={w} className="text-[14px] text-slate-900 font-bold pb-2">{w}</div>)}
        {Array(startOffset).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map(date => {
          const d = new Date(date)
          d.setHours(0, 0, 0, 0)
          const isSelected = selected && d.getTime() === selected.getTime()
          const isToday = d.getTime() === today.getTime()
          const isPast = d < today

          return (
            <div
              key={date.toISOString()}
              onClick={() => !isPast && onSelect(new Date(date))}
              className={`
                relative py-2.5 rounded-xl text-xm font-bold transition-all
                ${isPast ? 'text-slate-200 cursor-not-allowed' : 'cursor-pointer'}
                ${isSelected ? 'bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/20' : isToday && !isPast ? 'text-purple-600 hover:bg-purple-50' : !isPast ? 'text-slate-600 hover:bg-slate-50' : ''}
              `}
            >
              {date.getDate()}
              {isToday && !isSelected && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-600 rounded-full" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BookingClient(props: BookingClientProps) {
  const router = useRouter()
  const { showAlert } = useAlert()
  const { is_member, manager, event, schedule, booking_cache, line_uid, limit } = props

  // -- State --
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    line_uid: line_uid,
    selectedService: null as any,
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [isFirstStepAttempted, setIsFirstStepAttempted] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slotTime, setSlotTime] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)

  const bookingCacheSlotMap = new Map();

  // -- Cache --
  useEffect(() => {
    const cachedName = localStorage.getItem('booking_name')
    const cachedPhone = localStorage.getItem('booking_phone')
    const cachedEmail = localStorage.getItem('booking_email')
    if (cachedName || cachedPhone || cachedEmail) {
      setFormData(prev => ({
        ...prev,
        name: cachedName || prev.name,
        phone: cachedPhone || prev.phone,
        email: cachedEmail || prev.email,
      }))
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('booking_name', formData.name)
      localStorage.setItem('booking_phone', formData.phone)
      localStorage.setItem('booking_email', formData.email)
    }
  }, [formData.name, formData.phone, formData.email, isLoaded])

  // -- Event Options --
  const eventOptions = useMemo(() => {
    if (!event?.options) return { name: '', items: [] }
    try { return JSON.parse(event.options) } catch { return { name: '', items: [] } }
  }, [event])

  // -- Validation --
  const isPhoneValid = useMemo(() => {
    if (!formData.phone) return true
    const cleanPhone = formData.phone.replace(/[- ]/g, '')
    return /^09\d{8}$/.test(cleanPhone)
  }, [formData.phone])

  const isEmailValid = useMemo(() => {
    if (!formData.email) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
  }, [formData.email])

  // -- Slot Calculation --
  const getAvailableSlots = (date: Date) => {
    if (!schedule) return [];

    // 基礎參數設定
    const TIME_SLOT_INTERVAL = 30; // 假設間隔為 30 分鐘
    const dateStr = formatDate(date); // 預期格式: "2026-03-27"
    const dow = date.getDay() === 0 ? 7 : date.getDay();

    // 1. 取得規則 (Rules Extraction)
    // 過濾出符合當天日期的 Override
    const dayOverrides = schedule.overrides.filter(o =>
      TimeUtils.getDatePart(o.override_start_time) === dateStr
    );

    let activeRules: { start: number, end: number, cap: number, last: number }[] = [];

    if (dayOverrides.length > 0) {
      // 優先使用特別排班 (Overrides)
      activeRules = dayOverrides
        .filter(o => !o.is_closed)
        .map(o => {
          const s = timeToMinutes(TimeUtils.getTimePart(o.override_start_time));
          const e = timeToMinutes(TimeUtils.getTimePart(o.override_end_time));
          // Override 通常直接以結束時間作為最後預約限制
          return { start: s, end: e, cap: o.max_capacity, last: e };
        });
    } else {
      // 使用常規排班 (Standard Times)
      activeRules = schedule.times
        .filter(t => t.day_of_week === dow && t.is_open)
        .map(t => {
          const part = t.time_range.split('-')
          const s = timeToMinutes(part[0]);
          const e = timeToMinutes(part[1]);

          // 判斷是否開啟「最後預約時間」限制
          const isOpenLast = String(t.is_open_last_booking_time) === 'true' || t.is_open_last_booking_time === true;
          // 如果沒開，最後預約時間就是結束時間 e；如果有開，解析 last_booking_time
          const last = isOpenLast ? timeToMinutes(t.last_booking_time) : e;

          return { start: s, end: e, cap: t.max_capacity, last: last };
        });
    }

    if (activeRules.length === 0) return [];

    // 2. 切分時段 (Slot Splitting)
    const rawSlots: ScheduleSlotProps[] = [];
    const minStart = Math.min(...activeRules.map(r => r.start));
    const maxEnd = Math.max(...activeRules.map(r => r.end));

    let currentLastBooking = 0;
    for (let time = minStart; time + TIME_SLOT_INTERVAL <= maxEnd; time += TIME_SLOT_INTERVAL) {
      let bestCap = -1;


      // 尋找涵蓋此時間點的規則
      for (const rule of activeRules) {
        if (time >= rule.start && (time + TIME_SLOT_INTERVAL) <= rule.end) {
          bestCap = Math.max(bestCap, rule.cap);
          currentLastBooking = Math.max(currentLastBooking, rule.last);
        }
      }

      if (bestCap > 0) {
        const slotStartStr = minutesToTime(time); // 格式如 "09:00"
        const cacheKey = `${dateStr} ${slotStartStr}`; // 格式如 "2026-03-27 09:00"
        // 計算已預約人數
        const cacheEntry = (booking_cache || []).find(c => {
          if (!c || !c.booking_start_time) return false;
          // 確保 TimeUtils.getDateTime 回傳格式也是 "YYYY-MM-DD HH:mm"
          return TimeUtils.getDateTime(c.booking_start_time) === cacheKey;
        });
        const bookedCount = cacheEntry ? cacheEntry.booked_count : 0;

        const available = bestCap - bookedCount;

        // 關鍵判定：當前時間必須早於最後預約時間
        if (available > 0) {
          rawSlots.push({
            uid: `${dateStr}_${slotStartStr}`,
            time_label: slotStartStr,
            time_range: `${slotStartStr}-${minutesToTime(time + TIME_SLOT_INTERVAL)}`,
            time_start: `${slotStartStr}`,
            max_capacity: bestCap,
            available_capacity: available,
            start_minutes: time
          });
        }
      }
    }

    // 3. 檢查服務所需區間 (Multi-block Check)
    const serviceDuration = formData.selectedService ? Number(formData.selectedService.duration) : TIME_SLOT_INTERVAL;
    const requiredBlocks = Math.ceil(serviceDuration / TIME_SLOT_INTERVAL);

    const validSlots = [];
    for (let i = 0; i < rawSlots.length; i++) {
      let isValid = true;
      for (let j = 0; j < requiredBlocks; j++) {
        const target = rawSlots[i + j];
        // 檢查後續的 block 是否連續存在
        if (!target || target.start_minutes !== (rawSlots[i].start_minutes + j * TIME_SLOT_INTERVAL)) {
          isValid = false;
          break;
        }
      }

      if (rawSlots[i].start_minutes >= currentLastBooking) {
        isValid = false;
      }


      if (isValid) {
        validSlots.push(rawSlots[i]);
      }
    }

    // 存入 Map 以供後續快速讀取
    bookingCacheSlotMap.set(dateStr, validSlots);

    return validSlots;
  };

  const handleConfirmBooking = async () => {
    if (!event || !selectedDate || !selectedTimeSlot || !formData.selectedService) return

    setIsSubmitting(true)
    const dateStr = formatDate(selectedDate)
    const startTimePart = selectedTimeSlot.split('_')[1]
    const startDateTime = TimeUtils.combineDateTime(dateStr, startTimePart)
    const duration = Math.ceil(Number(formData.selectedService.duration) / TIME_SLOT_INTERVAL) * TIME_SLOT_INTERVAL
    const endTimePart = minutesToTime(timeToMinutes(startTimePart) + duration)
    const endDateTime = TimeUtils.combineDateTime(dateStr, endTimePart)

    const payload = {
      manager_uid: event.manager_uid,
      name: formData.name,
      phone: formData.phone,
      service_item: formData.selectedService.title,
      booking_start_time: TimeUtils.toUTC(startDateTime),
      booking_end_time: TimeUtils.toUTC(endDateTime),
      service_computed_duration: duration,
      line_uid: formData.line_uid || '',
    }


    setSlotTime(`${startTimePart}-${endTimePart} (${duration}分鐘)`)


    const startMins = timeToMinutes(startTimePart)
    const maxCapacityArray = bookingCacheSlotMap.get(dateStr).filter((slot: { start_minutes: number; booked_count: any }) => {

      if (slot.start_minutes >= startMins && slot.start_minutes < startMins + duration) {
        return slot
      }
    }).map((slot: { max_capacity: number; }) => {
      return slot.max_capacity
    })

    try {
      const res = await submitBooking(payload, maxCapacityArray, TIME_SLOT_INTERVAL)
      if (res.success) {
        setStep(3)
      } else {
        showAlert({ message: res.message || '預約失敗，請稍後再試。', type: 'error' })
      }
    } catch (err) {
      showAlert({ message: '預約發生錯誤', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <div className="min-h-screen bg-slate-50 pb-12 relative overflow-x-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute -top-32 -right-32 w-[60vw] h-[60vw] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[50vw] h-[50vw] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1000px] mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="sticky top-4 z-50 bg-white/80 backdrop-blur-2xl border border-slate-200/50 rounded-2xl mb-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white/5 rounded-xl border border-white/10 overflow-hidden shrink-0">
              {manager?.logo_url && (
                <img
                  src={manager?.logo_url}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <h1 className="font-extrabold text-xm text-slate-800 line-clamp-1">{event.title}</h1>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-2 max-w-[500px] mx-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2 relative z-10">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-ms font-bold transition-all duration-500
                ${step === s ? 'bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/30 scale-110' : step > s ? 'bg-green-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-900'}
              `}>
                {step > s ? <Check size={16} strokeWidth={3} /> : s}
              </div>
              <span className={`text-[14px] font-bold uppercase tracking-wider ${step >= s ? 'text-slate-800' : 'text-slate-900'}`}>
                {s === 1 ? '基本資訊' : s === 2 ? '選擇時間' : '預約成功'}
              </span>
            </div>
          ))}
        </div>

        {/* Form Content */}
        <div className="max-w-[1000px] transition-all duration-500">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
              <section className="bg-white p-8 rounded-[2rem] border border-slate-200/50 shadow-xl shadow-slate-200/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Left: Info */}
                  <div className="space-y-6">
                    <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em]">活動細節</h2>
                    <div className="text-slate-600 leading-relaxed whitespace-pre-wrap text-xm">
                      {event.description || '暫無活動說明'}
                    </div>
                  </div>

                  {/* Right: Inputs */}
                  <div className="space-y-6">
                    <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em]">預約資料</h2>
                    <div className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="text-[14px] font-bold text-slate-500 ml-1">姓名 <span className="text-rose-500">*</span></label>
                        <div className="relative group">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" />
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            placeholder="您的姓名"
                            className={`text-black w-full bg-slate-50 border-2 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all ${isFirstStepAttempted && !formData.name ? 'border-rose-200 bg-rose-50' : 'border-transparent focus:border-purple-600/20 focus:bg-white'}`}
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      {event.is_phone_required && (
                        <div className="space-y-1.5">
                          <label className="text-[14px] font-bold text-slate-500 ml-1">電話 <span className="text-rose-500">*</span></label>
                          <div className="relative group">
                            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" />
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                              placeholder="09XXXXXXXX"
                              className={`text-black w-full bg-slate-50 border-2 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all ${(isFirstStepAttempted && !formData.phone) || (formData.phone && !isPhoneValid) ? 'border-rose-200 bg-rose-50' : 'border-transparent focus:border-purple-600/20 focus:bg-white'}`}
                            />
                          </div>
                          {formData.phone && !isPhoneValid && <p className="text-[14px] text-rose-500 font-bold ml-1">格式不正確</p>}
                        </div>
                      )}

                      {/* Email */}
                      {event.is_email_required && (
                        <div className="space-y-1.5">
                          <label className="text-[14px] font-bold text-slate-300 ml-1">信箱 <span className="text-rose-500">*</span></label>
                          <div className="relative group">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" />
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                              placeholder="example@email.com"
                              className={`text-black w-full bg-slate-50 border-2 rounded-2xl pl-12 pr-4 py-3.5 text-xm outline-none transition-all ${(isFirstStepAttempted && !formData.email) || (formData.email && !isEmailValid) ? 'border-rose-200 bg-rose-50' : 'border-transparent focus:border-purple-600/20 focus:bg-white'}`}
                            />
                          </div>
                          {formData.email && !isEmailValid && <p className="text-[14px] text-rose-500 font-bold ml-1">格式不正確</p>}
                        </div>
                      )}

                      {/* Service Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[14px] font-bold text-slate-500 ml-1">預約項目 <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`text-black w-full bg-slate-50 border-2 rounded-2xl px-5 py-3.5 text-sm flex justify-between items-center transition-all ${isFirstStepAttempted && !formData.selectedService ? 'border-rose-200 bg-rose-50' : (isDropdownOpen ? 'border-purple-600/20 bg-white ring-4 ring-purple-600/5' : 'border-transparent')}`}
                          >
                            <div className="flex items-center gap-2">
                              {formData.selectedService ? (
                                <span className="font-extrabold text-slate-800">{formData.selectedService.title} <span className="text-ms text-slate-900 font-normal">({formData.selectedService.duration} min)</span></span>
                              ) : (
                                <span className="text-slate-900">請挑選項目...</span>
                              )}
                            </div>
                            <ChevronDown size={18} className={`text-slate-900 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] max-h-60 overflow-y-auto p-2 animate-in fade-in zoom-in-95">
                              {eventOptions.items.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setFormData(p => ({ ...p, selectedService: item }))
                                    setIsDropdownOpen(false)
                                  }}
                                  className={`p-2 rounded-xl cursor-pointer flex justify-between items-center transition-colors ${formData.selectedService === item ? 'bg-purple-50 text-purple-600' : 'hover:bg-slate-50'}`}
                                >
                                  <div>
                                    <div className="text-black font-bold text-sm">{item.title}</div>
                                    <div className="text-gray-800 text-sm opacity-60">{item.duration} 分鐘</div>
                                  </div>
                                  {formData.selectedService === item && <Check size={14} />}
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
                  setIsFirstStepAttempted(true)
                  const canProceed = formData.name && formData.selectedService &&
                    (event.is_phone_required ? (formData.phone && isPhoneValid) : true) &&
                    (event.is_email_required ? (formData.email && isEmailValid) : true)
                  if (canProceed) setStep(2)
                }}
                className="w-full bg-gradient-to-br from-purple-600 to-cyan-600 py-4 rounded-2xl text-white font-black shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xm flex items-center justify-center gap-2"
              >
                下一步：選擇預約時間 <ChevronRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Calendar */}
                <section className="bg-white p-8 rounded-[2rem] border border-slate-200/50 shadow-xl shadow-slate-200/20">
                  <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <CalendarIcon size={14} className="text-purple-600" /> 選擇日期
                  </h2>
                  <SimpleCalendar selected={selectedDate} onSelect={setSelectedDate} limit={limit} />
                </section>

                {/* Times */}
                <section className="bg-white p-8 rounded-[2rem] border border-slate-200/50 shadow-xl shadow-slate-200/20 flex flex-col">
                  <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Clock size={14} className="text-purple-600" /> 開放時段
                  </h2>
                  {selectedDate ? (
                    <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                      {getAvailableSlots(selectedDate).map((slot: ScheduleSlotProps, idx: React.Key | null | undefined) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedTimeSlot(slot.uid)}
                          className={`
                            p-3 rounded-2xl border-2 flex flex-col items-center transition-all
                            ${selectedTimeSlot === slot.uid ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-slate-50 bg-slate-50 text-slate-300 hover:border-slate-200'}
                          `}
                        >
                          <span className={`text-[14px] font-black ${selectedTimeSlot === slot.uid ? 'text-purple-600' : 'text-emerald-600'}`}>{slot.time_start}</span>
                          <span className={`text-[14px] font-bold ${selectedTimeSlot === slot.uid ? 'text-purple-600' : 'text-slate-900'}`} >可預約 {slot.available_capacity} 位</span>
                        </button>
                      ))}
                      {getAvailableSlots(selectedDate).length === 0 && (
                        <div className="col-span-3 py-12 text-center text-slate-900 text-ms font-bold">當日目前無可預約時段</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3">
                      <CalendarIcon size={32} strokeWidth={1} />
                      <p className="text-ms font-bold">請先點擊左側日曆選擇日期</p>
                    </div>
                  )}
                </section>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="w-40 py-4 bg-white border border-slate-200 rounded-2xl text-slate-300 font-bold text-xm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft size={18} /> 上一步
                </button>
                <button
                  disabled={!selectedDate || !selectedTimeSlot || isSubmitting}
                  onClick={handleConfirmBooking}
                  className="flex-1 bg-gradient-to-br from-purple-600 to-cyan-600 py-4 rounded-2xl text-white font-black shadow-xl shadow-purple-500/20 disabled:grayscale disabled:opacity-50 transition-all text-xm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> 送出中...</> : <><CheckCircle2 size={18} /> 確認預約</>}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in zoom-in-95 duration-500 max-w-[500px] mx-auto text-center">
              <div className="bg-white p-12 rounded-[3rem] border border-slate-200/50 shadow-2xl">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <CheckCircle2 size={48} strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">預約成功！</h2>
                <p className="text-slate-500 text-xm mb-10 leading-relaxed font-bold">
                  感謝您的預約，系統已收到您的申請。
                </p>

                <div className="bg-slate-50 p-6 rounded-3xl text-left space-y-4 mb-10 border border-slate-100">
                  <p className="text-[14px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">預約明細</p>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1 text-xm">
                      <span className="text-slate-500 font-bold text-xs">姓名</span>
                      <span className="text-slate-800 font-black">{formData.name}</span>
                    </div>
                    {formData.phone && (
                      <div className="flex flex-col gap-1 text-xm">
                        <span className="text-slate-500 font-bold text-xs">電話</span>
                        <span className="text-slate-800 font-black">{formData.phone}</span>
                      </div>
                    )}
                    {formData.email && (
                      <div className="flex flex-col gap-1 text-xm">
                        <span className="text-slate-500 font-bold text-xs">信箱</span>
                        <span className="text-slate-800 font-black">{formData.email}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 text-xm">
                      <span className="text-slate-500 font-bold text-xs">服務項目</span>
                      <span className="text-slate-800 font-black">{formData.selectedService?.title}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-xm">
                      <span className="text-slate-500 font-bold text-xs">預約日期</span>
                      <span className="text-slate-800 font-black">{selectedDate ? formatDate(selectedDate) : ''}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-xm">
                      <span className="text-slate-500 font-bold text-xs">時段</span>
                      <span className="text-slate-800 font-black">{slotTime}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="text-purple-600 font-black text-xm hover:underline decoration-2 underline-offset-8"
                >
                  繼續下一筆預約
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Version */}
        <footer className="mt-12 text-center">
          <p className="text-[14px] font-bold text-slate-300 tracking-widest uppercase">
            v0.1.1 © Triple Reservation System
          </p>
        </footer>
      </div>
    </div>
  )
}
