'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import {
  ChevronLeft, Save, Plus, Trash2, Clock, Users, Loader2, Calendar, ArrowRight, X, Edit
} from 'lucide-react'
import type { ScheduleTime, ScheduleOverride, ScheduleFormProps } from '@/types'
import { saveScheduleConfig, saveOverride, deleteOverride } from '@/app/actions/schedules'
import { useAlert } from '@/components/ui/DialogProvider'
import { nanoid } from 'nanoid'
import { TimeUtils } from '@/lib/TimeUtils'
import { ROUTES } from '@/constants/routes'


const DAY_LABELS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2).toString().padStart(2, '0')
  const minutes = (i % 2 === 0 ? '00' : '30')
  return `${hours}:${minutes}`
})
const END_TIME_OPTIONS = [...TIME_OPTIONS.slice(1), '23:59']

export default function ScheduleForm({ id, managerUid, initialData }: ScheduleFormProps) {
  const isNew = id === 'new'
  const router = useRouter()
  const { showAlert, showConfirm } = useAlert()
  const [isSaving, setIsSaving] = useState(false)

  // Form State
  const [name, setName] = useState(initialData.menu?.name || '')
  const [times, setTimes] = useState<ScheduleTime[]>(initialData.times)
  const [overrides, setOverrides] = useState<ScheduleOverride[]>(initialData.overrides)

  // Modal State for Overrides
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOverride, setEditingOverride] = useState<ScheduleOverride | null>(null)
  const [isSavingOverride, setIsSavingOverride] = useState(false)
  const [tempIsClosed, setTempIsClosed] = useState(false)

  const generateUid = () => nanoid(8);

  const makeTempTime = (dow: number): ScheduleTime => ({
    uid: `_new_${generateUid()}`,
    schedule_menu_uid: isNew ? '' : id,
    time_range: '09:00-18:00',
    day_of_week: dow,
    max_capacity: 2,
    is_open: true,
    is_open_last_booking_time: false,
    last_booking_time: '17:00',
    create_at: new Date().toISOString(),
    update_at: new Date().toISOString()
  })

  // ---------------------------------------------------------------------------
  // Core Actions
  // ---------------------------------------------------------------------------

  const addSlot = (dow: number) => {
    setTimes(prev => [...prev, makeTempTime(dow)])
  }

  const removeSlot = (uid: string) => {
    setTimes(prev => prev.filter(t => t.uid !== uid))
  }

  const updateSlot = <K extends keyof ScheduleTime>(uid: string, key: K, value: ScheduleTime[K]) => {
    setTimes(prev => prev.map(t => (t.uid === uid ? { ...t, [key]: value } : t)))
  }

  // 同步當天所有時段的最後預約設定
  const updateDayLastBooking = (dow: number, updates: Partial<ScheduleTime>) => {
    setTimes(prev => prev.map(t => (t.day_of_week === dow ? { ...t, ...updates } : t)))
  }

  const toggleDay = (dow: number, enabled: boolean) => {
    if (enabled) {
      const slotsToRemove = times.filter(t => t.day_of_week === dow)
      slotsToRemove.forEach(s => removeSlot(s.uid))
    } else {
      addSlot(dow)
    }
  }

  const handleSave = async () => {
    // 檢查是否有實質變動 (Dirty Check)
    const isNameChanged = name !== (initialData.menu?.name || '')
    const isTimesLengthChanged = times.length !== initialData.times.length

    let isTimesDirty = isTimesLengthChanged
    if (!isTimesDirty) {
      // 詳細檢查每個時段的內容
      for (const t of times) {
        const orig = initialData.times.find(ot => ot.uid === t.uid)
        if (!orig ||
          orig.time_range !== t.time_range ||
          orig.max_capacity !== t.max_capacity ||
          orig.is_open_last_booking_time !== t.is_open_last_booking_time ||
          orig.last_booking_time !== t.last_booking_time
        ) {
          isTimesDirty = true
          break
        }
      }
    }

    const isDirty = isNameChanged || isTimesDirty || isNew

    if (!isDirty) {
      router.push('/schedules')
      return
    }

    setIsSaving(true)
    const targetMenuUid = isNew ? generateUid() : id

    // 預處理要送往 server 的 times
    const timesToUpsert = times.map(t => ({
      ...t,
      uid: t.uid.startsWith('_new_') ? generateUid() : t.uid,
      schedule_menu_uid: targetMenuUid,
      is_open: t.is_open,
      is_open_last_booking_time: t.is_open_last_booking_time
    }))

    const payload = {
      menu: {
        uid: targetMenuUid,
        manager_uid: managerUid,
        name: name || '未命名模板'
      },
      times: timesToUpsert
    }

    try {
      const res = await saveScheduleConfig(payload)
      if (res.success) {
        router.push(ROUTES.ADMIN.SCHEDULES)
        router.refresh()
      } else {
        showAlert({ message: '儲存失敗: ' + res.message, type: 'error' })
      }
    } catch (err) {
      console.error(err)
      showAlert({ message: '系統錯誤', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Override Actions
  // ---------------------------------------------------------------------------

  const openAddOverride = () => {
    setEditingOverride(null)
    setTempIsClosed(false)
    setIsModalOpen(true)
  }

  const openEditOverride = (o: ScheduleOverride) => {
    setEditingOverride(o)
    setTempIsClosed(o.is_closed)
    setIsModalOpen(true)
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value
    if (!selectedDate) return

    const isDuplicate = overrides.some(o =>
      TimeUtils.getDatePart(o.override_start_time) === selectedDate &&
      o.uid !== editingOverride?.uid
    )

    if (isDuplicate) {
      showAlert({ message: `日期 ${selectedDate} 已經設定過覆寫規則了。請重新選擇其他日期。`, type: 'warning' })
      e.target.value = '' // 清除選取
    }
  }

  const handleDeleteOverride = async (uid: string) => {
    const isConfirmed = await showConfirm({
      message: '確定要刪除此特別日期設定嗎？',
      type: 'warning'
    })
    if (!isConfirmed) return
    const res = await deleteOverride(uid)
    if (res.success) {
      setOverrides(prev => prev.filter(o => o.uid !== uid))
    } else {
      showAlert({ message: '刪除失敗', type: 'error' })
    }
  }

  const handleSaveOverride = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSavingOverride(true)
    const formData = new FormData(e.currentTarget)

    const overrideDate = formData.get('date') as string

    // 檢查日期是否重複 (排除目前正在編輯的項目)
    const isDuplicate = overrides.some(o =>
      TimeUtils.getDatePart(o.override_start_time) === overrideDate &&
      o.uid !== editingOverride?.uid
    )

    if (isDuplicate) {
      showAlert({ message: `日期 ${overrideDate} 已經設定過覆寫規則了。`, type: 'warning' })
      setIsSavingOverride(false)
      return
    }

    const start = formData.get('startTime') as string
    const end = formData.get('endTime') as string

    const startTime = TimeUtils.toUTC(`${overrideDate} ${start || '00:00'}`)
    const endTime = TimeUtils.toUTC(`${overrideDate} ${end || '23:59'}`)

    const capacity = Number(formData.get('capacity'))

    const overrideData = {
      uid: editingOverride?.uid || generateUid(),
      schedule_menu_uid: isNew ? '' : id, // 注意！若為 new 可能需要先暫存。但 reference 是 id! == 'new' 才能加。
      override_start_time: startTime,
      override_end_time: endTime,
      max_capacity: capacity,
      is_closed: tempIsClosed ? 1 : 0
    }

    if (isNew) {
      showAlert({ message: '請先儲存主時程模板後再設定特別日期。', type: 'warning' })
      setIsSavingOverride(false)
      return
    }

    const targetUid = isNew ? '' : id

    overrideData.schedule_menu_uid = targetUid

    const res = await saveOverride(overrideData)
    if (res.success) {
      const newOverride = {
        ...overrideData,
        is_closed: tempIsClosed
      } as ScheduleOverride

      if (editingOverride) {
        setOverrides(prev => prev.map(o => o.uid === editingOverride.uid ? newOverride : o))
      } else {
        setOverrides(prev => [newOverride, ...prev])
      }
      setIsModalOpen(false)
    } else {
      showAlert({ message: '儲存失敗: ' + res.message, type: 'error' })
    }
    setIsSavingOverride(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header (標籤與儲存) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sticky top-0 z-30 pt-4 pb-4 backdrop-blur-2xl -mx-4 px-4 bg-black/60 border-b border-white/5 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-lg group active:scale-95"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-white leading-tight truncate">
              {isNew ? '新增時程設定' : '編輯排程設定'}
            </h1>
            <p className="text-slate-300 text-[14px] font-bold font-mono tracking-widest mt-0.5 opacity-60 truncate">
              {isNew ? 'NEW_TEMPLATE' : id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => router.push(ROUTES.ADMIN.SCHEDULES)}
            className="flex-1 sm:flex-none px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all font-bold text-xm active:scale-95"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-black text-xm text-white shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{isSaving ? '正在儲存' : '儲存設定'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Template Label */}
          <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-xl group hover:border-white/20 transition-all">
            <label className="text-[14px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 block">模板名稱名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：一般營業時間..."
              className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-white focus:border-purple-500/50 focus:bg-white/15 outline-none transition-all placeholder-slate-600 shadow-inner"
            />
          </div>

          {/* Daily Config */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <Clock size={16} className="text-cyan-400" />
              <h3 className="text-xm font-bold text-slate-400 uppercase tracking-widest">每週營業時段</h3>
            </div>

            <div className="grid gap-4">
              {DAY_LABELS.map((label, index) => {
                const dow = index + 1
                const slots = times.filter(t => t.day_of_week === dow)
                const enabled = slots.length > 0
                const firstSlot = slots[0]

                return (
                  <div key={dow} className={`bg-white/5 border rounded-[2rem] transition-all duration-300 ${enabled ? 'border-purple-500/40 bg-purple-500/[0.02]' : 'border-white/5 opacity-50'}`}>
                    {/* Header */}
                    <div className="p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
                        <button
                          onClick={() => toggleDay(dow, enabled)}
                          className={`relative w-11 h-6 rounded-full transition-all duration-300 outline-none flex items-center ${enabled ? 'bg-purple-600' : 'bg-slate-700'}`}
                        >
                          <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                        </button>
                        <div className="flex flex-wrap items-center gap-3 md:gap-4">
                          <span className={`text-lg font-black transition-colors ${enabled ? 'text-white' : 'text-slate-300'}`}>{label}</span>

                          {/* Last Booking Setting */}
                          {enabled && (
                            <div className="flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl shadow-inner">
                              <span className="text-[14px] font-black text-slate-400 uppercase tracking-tighter">最後預約</span>
                              <button
                                onClick={() => updateDayLastBooking(dow, { is_open_last_booking_time: !firstSlot.is_open_last_booking_time })}
                                className={`w-7 h-4 rounded-full transition-all relative flex items-center ${firstSlot.is_open_last_booking_time ? 'bg-cyan-600' : 'bg-slate-800'}`}
                              >
                                <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                              </button>
                              <select
                                disabled={!firstSlot.is_open_last_booking_time}
                                value={firstSlot.last_booking_time}
                                onChange={(e) => updateDayLastBooking(dow, { last_booking_time: e.target.value })}
                                className="bg-transparent text-[13px] text-white font-black font-mono focus:outline-none disabled:opacity-20 cursor-pointer"
                              >
                                {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                      {enabled && (
                        <button
                          onClick={() => addSlot(dow)}
                          className="w-full sm:w-auto p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 hover:bg-purple-500/20 hover:text-white transition-all flex items-center justify-center gap-2 text-ms font-bold"
                        >
                          <Plus size={16} />
                          <span className="sm:hidden">新增時段</span>
                        </button>
                      )}
                    </div>

                    {/* Slots */}
                    {enabled && (
                      <div className="px-5 md:px-6 pb-6 space-y-4 border-t border-white/5 pt-6">
                        {slots.map(slot => (
                          <div key={slot.uid} className="flex flex-col md:flex-row gap-3 md:items-center">
                            <div className="flex-1 flex items-center gap-3 bg-white/10 border border-white/10 rounded-[1.25rem] px-4 py-3 shadow-inner">
                              <select
                                value={slot.time_range.split('-')[0]}
                                onChange={(e) => updateSlot(slot.uid, 'time_range', `${e.target.value}-${slot.time_range.split('-')[1]}`)}
                                className="bg-transparent text-white font-bold font-mono text-xm flex-1 cursor-pointer outline-none"
                              >
                                {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                              </select>
                              <ArrowRight size={14} className="text-slate-300 opacity-40" />
                              <select
                                value={slot.time_range.split('-')[1]}
                                onChange={(e) => updateSlot(slot.uid, 'time_range', `${slot.time_range.split('-')[0]}-${e.target.value}`)}
                                className="bg-transparent text-white font-bold font-mono text-xm flex-1 cursor-pointer outline-none"
                              >
                                {END_TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                              <div className="flex-1 md:w-32 flex items-center gap-3 bg-white/10 border border-white/10 rounded-[1.25rem] px-4 py-3 shadow-inner">
                                <Users size={16} className="text-cyan-400" />
                                <input
                                  type="number"
                                  min={1}
                                  value={slot.max_capacity}
                                  onChange={(e) => updateSlot(slot.uid, 'max_capacity', Number(e.target.value))}
                                  className="bg-transparent text-white font-black w-full focus:outline-none text-xm"
                                />
                              </div>
                              <button
                                onClick={() => removeSlot(slot.uid)}
                                className="p-3 text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-[1.25rem] transition-all"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Overrides */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                <Calendar size={18} className="text-purple-400" /> 特別日期覆寫
              </h3>
              <button
                onClick={openAddOverride}
                className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 hover:bg-purple-500/20 hover:text-white transition-all active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {overrides.length === 0 ? (
                <div className="p-10 text-center bg-white/5 border border-dashed border-white/10 rounded-[1.5rem] text-slate-300 text-xm font-medium">
                  目前尚無特別日期設定
                </div>
              ) : (
                overrides.map(o => (
                  <div key={o.uid} className="p-2 bg-white/10 border border-white/10 rounded-[1.5rem] group hover:border-purple-500/30 transition-all border-l-4 border-l-purple-500/50 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      {/* 左側資訊區塊：改為 flex-col 並使用 items-start 靠左 */}
                      <div className="font-black text-white text-[14px] flex flex-col items-start gap-1 flex-1 min-w-0">

                        {/* 日期列 */}
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-cyan-400 shrink-0" />
                          {TimeUtils.getDatePart(o.override_start_time)}
                        </span>

                        {/* 時間列 */}
                        {!o.is_closed && (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} className="text-cyan-400 shrink-0" />
                              {TimeUtils.formatTimeRange(o.override_start_time, o.override_end_time)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="items-center gap-1 shrink-0">
                        <button onClick={() => openEditOverride(o)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteOverride(o.uid)} className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-500/60 hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    {o.is_closed ? (
                      <span className="text-[12px] font-black bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 tracking-tighter shrink-0">
                        全天公休
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-400 font-black font-mono tracking-tight relative z-10">
                        <span className="flex items-center gap-1.5"><Users size={14} className="text-cyan-400" /> {o.max_capacity} 人</span>
                      </div>
                    )}
                    <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/5 blur-3xl rounded-full" />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-xl">
            <h3 className="text-[14px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 block">使用說明</h3>
            <ul className="space-y-4 text-ms font-bold text-slate-400 leading-relaxed">
              <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0 shadow-glow shadow-cyan-500/50" /> 特別日期會蓋過每週固定預約內容。</li>
              <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0 shadow-glow shadow-cyan-500/50" /> 若該日無設定時段，即代表不開放。</li>
              <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0 shadow-glow shadow-cyan-500/50" /> 最後預約時間必須設定在時段內。</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Override Modal */}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
          >
            <div className="p-6 md:p-8 flex justify-between items-center border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/20">
                  <Calendar size={24} className="text-purple-400" />
                </div>
                <h3 className="text-xl font-black text-white">{editingOverride ? '編輯' : '新增'}覆寫日期</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white"><X size={26} /></button>
            </div>

            <form onSubmit={handleSaveOverride} className="p-6 md:p-8 overflow-y-auto no-scrollbar space-y-6">
              <div className="flex items-center justify-between bg-white/10 border border-white/10 p-5 rounded-2xl shadow-inner group">
                <div className="flex flex-col">
                  <span className="text-xm font-black text-white">全天公休</span>
                  <span className="text-[14px] font-bold text-slate-300 tracking-tight mt-0.5">關閉該日所有預約時段</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTempIsClosed(!tempIsClosed)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 outline-none flex items-center ${tempIsClosed ? 'bg-rose-600 shadow-lg shadow-rose-500/20' : 'bg-slate-700'}`}
                >
                  <div style={{ x: tempIsClosed ? 26 : 4 }} className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[14px] font-black text-slate-300 uppercase tracking-widest pl-1">覆寫日期</label>
                <input
                  name="date"
                  type="date"
                  required
                  min={TimeUtils.getDatePart()}
                  onChange={handleDateChange}
                  defaultValue={TimeUtils.getDatePart(editingOverride?.override_start_time)}
                  className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-purple-500/50 focus:bg-white/15 transition-all shadow-inner [color-scheme:dark]"
                />
              </div>

              {!tempIsClosed && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[14px] font-black text-slate-300 uppercase tracking-widest pl-1">開始</label>
                      <select
                        name="startTime"
                        defaultValue={TimeUtils.getTimePart(editingOverride?.override_start_time) || '09:00'}
                        className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white font-black font-mono outline-none focus:border-purple-500/50 appearance-none shadow-inner cursor-pointer"
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[14px] font-black text-slate-300 uppercase tracking-widest pl-1">結束</label>
                      <select
                        name="endTime"
                        defaultValue={TimeUtils.getTimePart(editingOverride?.override_end_time) || '18:00'}
                        className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-white font-black font-mono outline-none focus:border-purple-500/50 appearance-none shadow-inner cursor-pointer"
                      >
                        {END_TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[14px] font-black text-slate-300 uppercase tracking-widest pl-1">最大預約容量</label>
                    <div className="flex items-center gap-4 bg-white/10 border border-white/10 rounded-2xl px-5 py-4 shadow-inner">
                      <Users size={20} className="text-cyan-400 shrink-0" />
                      <input
                        name="capacity"
                        type="number"
                        min={1}
                        defaultValue={editingOverride?.max_capacity || 2}
                        className="bg-transparent text-white font-black flex-1 focus:outline-none placeholder-slate-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSavingOverride}
                  className="flex-2 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-black text-white shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSavingOverride ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  <span>儲存覆寫</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div >
  )
}
