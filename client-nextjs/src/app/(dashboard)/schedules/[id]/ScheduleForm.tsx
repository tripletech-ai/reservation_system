'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Save, Plus, Trash2, Clock, Users, Loader2, Calendar, ArrowRight, X, Edit
} from 'lucide-react'
import type { ScheduleTime, ScheduleOverride, ScheduleFormProps } from '@/types'
import { saveScheduleConfig, saveOverride, deleteOverride } from '@/app/actions/schedules'
import { nanoid } from 'nanoid'


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
        router.push('/schedules')
        router.refresh()
      } else {
        alert('儲存失敗: ' + res.message)
      }
    } catch (err) {
      console.error(err)
      alert('系統錯誤')
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

  const handleDeleteOverride = async (uid: string) => {
    if (!confirm('確定要刪除此特別日期設定嗎？')) return
    const res = await deleteOverride(uid)
    if (res.success) {
      setOverrides(prev => prev.filter(o => o.uid !== uid))
    } else {
      alert('刪除失敗')
    }
  }

  const handleSaveOverride = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSavingOverride(true)
    const formData = new FormData(e.currentTarget)

    const overrideDate = formData.get('date') as string
    const start = formData.get('startTime') as string
    const end = formData.get('endTime') as string
    const capacity = Number(formData.get('capacity'))

    const overrideData = {
      uid: editingOverride?.uid || generateUid(),
      schedule_menu_uid: isNew ? '' : id, // 注意！若為 new 可能需要先暫存。但 reference 是 id! == 'new' 才能加。
      override_date: overrideDate,
      override_time: `${start}-${end}`,
      max_capacity: capacity,
      is_closed: tempIsClosed ? 1 : 0
    }

    if (isNew) {
      alert('請先儲存主時程模板後再設定特別日期。')
      setIsSavingOverride(false)
      return
    }

    const targetUid = isNew ? '' : id
    // @ts-ignore
    overrideData.schedule_menu_uid = targetUid

    const res = await saveOverride(overrideData)
    if (res.success) {
      const newOverride = {
        ...overrideData,
        is_closed: tempIsClosed,
        create_at: new Date().toISOString(),
        update_at: new Date().toISOString()
      } as ScheduleOverride

      if (editingOverride) {
        setOverrides(prev => prev.map(o => o.uid === editingOverride.uid ? newOverride : o))
      } else {
        setOverrides(prev => [newOverride, ...prev])
      }
      setIsModalOpen(false)
    } else {
      alert('儲存失敗: ' + res.message)
    }
    setIsSavingOverride(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header (標籤與儲存) */}
      <div className="flex items-center justify-between sticky top-0 z-30 pt-4 pb-4 backdrop-blur-xl -mx-4 px-4 bg-black/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {isNew ? '新增時程設定' : '編輯排程設定'}
            </h1>
            <p className="text-slate-500 text-xs font-mono">{isNew ? 'NEW_TEMPLATE' : id}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/schedules')} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all font-semibold">取消</button>
          <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-white shadow-xl shadow-purple-500/20 hover:scale-[1.02] flex items-center gap-2">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? '正在儲存' : '儲存設定'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Template Label */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">模板名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：一般營業時間..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl font-bold text-white focus:border-purple-500/50 outline-none transition-all"
            />
          </div>

          {/* Daily Config */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <Clock size={16} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">每週營業時段</h3>
            </div>

            <div className="grid gap-4">
              {DAY_LABELS.map((label, index) => {
                const dow = index + 1
                const slots = times.filter(t => t.day_of_week === dow)
                const enabled = slots.length > 0
                const firstSlot = slots[0]

                return (
                  <div key={dow} className={`bg-white/5 border rounded-3xl transition-all duration-300 ${enabled ? 'border-purple-500/30' : 'border-white/5 opacity-60'}`}>
                    {/* Header */}
                    <div className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <button onClick={() => toggleDay(dow, enabled)} className={`relative w-12 h-6 rounded-full transition-all ${enabled ? 'bg-purple-600' : 'bg-slate-700'}`}>
                          <motion.div animate={{ x: enabled ? 26 : 4 }} className="w-4 h-4 bg-white rounded-full mt-1" />
                        </button>
                        <div className="flex items-center gap-4">
                          <span className={`text-lg font-bold ${enabled ? 'text-white' : 'text-slate-500'}`}>{label}</span>

                          {/* Last Booking Setting */}
                          {enabled && (
                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-2xl">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">最後預約</span>
                              <button
                                onClick={() => updateDayLastBooking(dow, { is_open_last_booking_time: !firstSlot.is_open_last_booking_time })}
                                className={`w-8 h-4 rounded-full transition-all relative ${firstSlot.is_open_last_booking_time ? 'bg-cyan-600' : 'bg-slate-800'}`}
                              >
                                <motion.div animate={{ x: firstSlot.is_open_last_booking_time ? 18 : 2 }} className="w-3 h-3 bg-white rounded-full mt-0.5" />
                              </button>
                              <select
                                disabled={!firstSlot.is_open_last_booking_time}
                                value={firstSlot.last_booking_time}
                                onChange={(e) => updateDayLastBooking(dow, { last_booking_time: e.target.value })}
                                className="bg-transparent text-xs text-white font-mono focus:outline-none disabled:opacity-30 cursor-pointer"
                              >
                                {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                      {enabled && (
                        <button onClick={() => addSlot(dow)} className="p-2 bg-purple-500/10 rounded-xl text-purple-400 hover:bg-purple-500/20"><Plus size={18} /></button>
                      )}
                    </div>

                    {/* Slots */}
                    {enabled && (
                      <div className="px-6 pb-6 space-y-3 border-t border-white/5 pt-6">
                        {slots.map(slot => (
                          <div key={slot.uid} className="flex flex-wrap md:flex-nowrap gap-4 items-center">
                            <div className="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                              <select value={slot.time_range.split('-')[0]} onChange={(e) => updateSlot(slot.uid, 'time_range', `${e.target.value}-${slot.time_range.split('-')[1]}`)} className="bg-transparent text-white font-mono flex-1 cursor-pointer">
                                {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                              </select>
                              <ArrowRight size={14} className="text-slate-600" />
                              <select value={slot.time_range.split('-')[1]} onChange={(e) => updateSlot(slot.uid, 'time_range', `${slot.time_range.split('-')[0]}-${e.target.value}`)} className="bg-transparent text-white font-mono flex-1 cursor-pointer">
                                {END_TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                              </select>
                            </div>
                            <div className="w-full md:w-32 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                              <Users size={16} className="text-cyan-500" />
                              <input type="number" min={1} value={slot.max_capacity} onChange={(e) => updateSlot(slot.uid, 'max_capacity', Number(e.target.value))} className="bg-transparent text-white font-bold w-full focus:outline-none" />
                            </div>
                            <button onClick={() => removeSlot(slot.uid)} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"><Trash2 size={20} /></button>
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
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar size={16} className="text-purple-400" /> 特別日期覆寫
              </h3>
              <button
                onClick={openAddOverride}
                className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 hover:bg-purple-500/20 transition-all"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {overrides.length === 0 ? (
                <div className="p-8 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl text-slate-500 text-sm">
                  目前尚無特別設定
                </div>
              ) : (
                overrides.map(o => (
                  <div key={o.uid} className="p-4 bg-white/5 border border-white/10 rounded-2xl group border-l-4 border-l-purple-500/50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-white flex items-center gap-2">
                        {o.override_date}
                        {o.is_closed && <span className="text-[10px] bg-rose-500/20 text-rose-500 px-2 py-0.5 rounded-full border border-rose-500/20">公休</span>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditOverride(o)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><Edit size={14} /></button>
                        <button onClick={() => handleDeleteOverride(o.uid)} className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400 hover:text-rose-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {!o.is_closed && (
                      <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1"><Clock size={12} /> {o.override_time}</span>
                        <span className="flex items-center gap-1"><Users size={12} /> {o.max_capacity} 人</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">使用說明</h3>
            <ul className="space-y-3 text-sm text-slate-400 leading-relaxed">
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" /> 特別日期會蓋過每週固定預約。</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" /> 無時段即代表該日不開放預約。</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" /> 最後預約時間必須在時段範圍內。</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#111] border border-white/20 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{editingOverride ? '編輯' : '新增'}特別日期覆寫</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400"><X size={24} /></button>
              </div>

              <form onSubmit={handleSaveOverride} className="space-y-6">
                <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <span className="text-sm font-bold text-slate-300">本日全天公休</span>
                  <button
                    type="button"
                    onClick={() => setTempIsClosed(!tempIsClosed)}
                    className={`relative w-12 h-6 rounded-full transition-all ${tempIsClosed ? 'bg-rose-600' : 'bg-slate-700'}`}
                  >
                    <motion.div animate={{ x: tempIsClosed ? 26 : 4 }} className="w-4 h-4 bg-white rounded-full mt-1" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">覆寫日期</label>
                  <input name="date" type="date" required defaultValue={editingOverride?.override_date} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50" />
                </div>

                {!tempIsClosed && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">開始</label>
                        <select name="startTime" defaultValue={editingOverride?.override_time.split('-')[0] || '09:00'} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50">
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">結束</label>
                        <select name="endTime" defaultValue={editingOverride?.override_time.split('-')[1] || '18:00'} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50">
                          {END_TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">最大預約容量</label>
                      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                        <Users size={18} className="text-cyan-400" />
                        <input name="capacity" type="number" min={1} defaultValue={editingOverride?.max_capacity || 2} className="bg-transparent text-white font-bold flex-1 focus:outline-none" />
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-slate-300">取消</button>
                  <button type="submit" disabled={isSavingOverride} className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2">
                    {isSavingOverride ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    儲存覆寫
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
