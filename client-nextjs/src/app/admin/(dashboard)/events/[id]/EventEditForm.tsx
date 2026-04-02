'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Save, Plus, Trash2, Clock, Mail, Phone,
  FileText, Loader2, ArrowRight, X, Layout, CheckCircle2,
  Edit2, Tag, Box
} from 'lucide-react'
import type { EventEditFormProps } from '@/types'
import { saveEvent } from '@/app/actions/events'
import { useAlert } from '@/components/ui/DialogProvider'
import { ROUTES } from '@/constants/routes'

export default function EventEditForm({ id, managerUid, managerWebsiteName, initialEvent, menus }: EventEditFormProps) {
  const router = useRouter()
  const { showAlert } = useAlert()
  const isNew = id === 'new'
  const [isSaving, setIsSaving] = useState(false)

  // Form State
  const [title, setTitle] = useState(initialEvent?.title || '')
  const [description, setDescription] = useState(initialEvent?.description || '')
  const [isPhoneRequired, setIsPhoneRequired] = useState(initialEvent?.is_phone_required ?? true)
  const [isEmailRequired, setIsEmailRequired] = useState(initialEvent?.is_email_required ?? false)
  const [bookingDynamicUrl, setBookingDynamicUrl] = useState(initialEvent?.booking_dynamic_url || '')

  const [options, setOptions] = useState(() => {
    try {
      return initialEvent?.options ? JSON.parse(initialEvent.options) : { name: '', items: [] }
    } catch (e) {
      return { name: '', items: [] }
    }
  })

  const [selectedMenus, setSelectedMenus] = useState<{ uid: string }[]>(() => {
    try {
      return initialEvent?.schedule_menu_uid ? JSON.parse(initialEvent.schedule_menu_uid) : []
    } catch (e) {
      return []
    }
  })

  // Modal State for service items
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tempOptions, setTempOptions] = useState(options)

  const openOptionModal = () => {
    setTempOptions(JSON.parse(JSON.stringify(options)))
    setIsModalOpen(true)
  }

  const handleSaveOptions = () => {
    if (!tempOptions.name.trim()) return showAlert({ message: '請輸入選單分類名稱', type: 'warning' })
    if (tempOptions.items.length === 0) return showAlert({ message: '請至少新增一個服務項目', type: 'warning' })
    setOptions(tempOptions)
    setIsModalOpen(false)
  }

  const handleSave = async () => {
    if (!title.trim()) return showAlert({ message: '請輸入活動標題', type: 'warning' })

    setIsSaving(true)
    const payload = {
      uid: isNew ? undefined : id,
      manager_uid: managerUid,
      title,
      description,
      is_phone_required: isPhoneRequired,
      is_email_required: isEmailRequired,
      booking_dynamic_url: bookingDynamicUrl,
      website_name: managerWebsiteName,
      options: JSON.stringify(options),
      schedule_menu_uid: JSON.stringify(selectedMenus)
    }

    const res = await saveEvent(payload)
    if (res.success) {
      router.push(ROUTES.ADMIN.EVENTS)
      router.refresh()
    } else {
      showAlert({ message: '儲存失敗: ' + res.message, type: 'error' })
    }
    setIsSaving(false)
  }

  const toggleMenuVisibility = (uid: string) => {
    setSelectedMenus(prev => {
      const exists = prev.some(m => m.uid === uid)
      return exists ? prev.filter(m => m.uid !== uid) : [...prev, { uid }]
    })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-30 pt-4 pb-4 backdrop-blur-xl -mx-4 px-4 bg-black/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.back()}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {isNew ? '新增預約項目' : '編輯活動設定'}
            </h1>
            <p className="text-slate-300 text-ms font-mono">{isNew ? 'NEW_EVENT' : id}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push(ROUTES.ADMIN.EVENTS)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all font-semibold">取消</button>
          <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-white shadow-xl shadow-purple-500/20 hover:scale-[1.02] flex items-center gap-2">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? '正在儲存' : '儲存活動'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Basic & Options */}
        <div className="lg:col-span-8 space-y-6">
          {/* Base Info */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-purple-400" />
              <h3 className="text-xm font-bold text-slate-400 uppercase tracking-widest">基本設定</h3>
            </div>

            <div className="space-y-4">
              <div className="group">
                <label className="text-ms font-bold text-slate-300 uppercase mb-2 block">項目名稱</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="請輸入活動或服務標題..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-2 py-1 text-xl font-bold text-white focus:border-purple-500/50 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                <div className="group">
                  <label className="text-ms font-bold text-slate-300 uppercase mb-2 block">動態網址路徑</label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 group-focus-within:border-cyan-500/50 transition-all">
                    <span className="text-blue-600 text-ms shrink-0">{managerWebsiteName}/</span>
                    <input
                      type="text"
                      value={bookingDynamicUrl}
                      onChange={(e) => setBookingDynamicUrl(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="massage-spa"
                      className="w-full bg-transparent text-white font-mono text-xm outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="text-ms font-bold text-slate-300 uppercase mb-2 block">詳細描述</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="介紹一下這個預約項目的內容吧..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-2 py-1 text-white focus:border-purple-500/50 outline-none transition-all resize-y"
                />
              </div>
            </div>
          </div>

          {/* Service Items */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Layout size={16} className="text-cyan-400" />
                <h3 className="text-xm font-bold text-slate-400 uppercase tracking-widest">服務選單</h3>
              </div>
              <button
                onClick={openOptionModal}
                className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 hover:bg-cyan-500/20 text-ms font-bold flex items-center gap-2 transition-all"
              >
                <Edit2 size={14} /> 編輯項目
              </button>
            </div>

            {options.name ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Tag size={14} className="text-cyan-500" />
                  <span className="text-lg font-bold text-white">{options.name}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {options.items.map((item: any, idx: number) => (
                    <div key={idx} className="m-1 p-1 px-2 bg-white/5 border border-white/10 rounded-2xl flex-col justify-between items-center group/item hover:border-cyan-500/30 transition-all">
                      <span className="text-slate-200 font-semibold">{item.title}</span>
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Clock size={12} />
                        {item.duration} 分鐘
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                <Box className="w-10 h-10 mb-4 opacity-10" />
                <p className="text-xm">尚未設定服務項目與分類</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings & Schedules */}
        <div className="lg:col-span-4 space-y-6">
          {/* Data Requirements */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
            <h3 className="text-ms font-bold text-slate-300 uppercase tracking-widest mb-6">客戶資料要求</h3>
            <div className="space-y-4">
              <button
                onClick={() => setIsPhoneRequired(!isPhoneRequired)}
                className={`w-full flex items-center justify-between p-1 rounded-2xl border transition-all ${isPhoneRequired ? 'bg-purple-500/10 border-purple-500/30 text-white' : 'bg-white/5 border-white/10 text-slate-300'}`}
              >
                <div className="flex items-center gap-3">
                  <Phone size={18} className={isPhoneRequired ? 'text-purple-400' : ''} />
                  <span className="text-xm font-semibold">手機號碼 (必填)</span>
                </div>
                {isPhoneRequired && <CheckCircle2 size={18} className="text-purple-400" />}
              </button>

              <button
                onClick={() => setIsEmailRequired(!isEmailRequired)}
                className={`w-full flex items-center justify-between p-1 rounded-2xl border transition-all ${isEmailRequired ? 'bg-purple-500/10 border-purple-500/30 text-white' : 'bg-white/5 border-white/10 text-slate-300'}`}
              >
                <div className="flex items-center gap-3">
                  <Mail size={18} className={isEmailRequired ? 'text-purple-400' : ''} />
                  <span className="text-xm font-semibold">電子郵件 (必填)</span>
                </div>
                {isEmailRequired && <CheckCircle2 size={18} className="text-purple-400" />}
              </button>
            </div>
          </div>

          {/* Linked Schedules */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6">
              <Clock size={16} className="text-cyan-400" />
              <h3 className="text-ms font-bold text-slate-300 uppercase tracking-widest">適用營業時間</h3>
            </div>

            <div className="space-y-2">
              {menus.length === 0 ? (
                <div className="p-6 text-center text-ms text-slate-600 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                  尚未建立時程模板
                </div>
              ) : (
                menus.map(menu => {
                  const isSelected = selectedMenus.some(sm => sm.uid === menu.uid)
                  return (
                    <button
                      key={menu.uid}
                      onClick={() => toggleMenuVisibility(menu.uid)}
                      className={`w-full flex items-center gap-3 p-1 rounded-2xl border transition-all text-left ${isSelected ? 'bg-cyan-500/10 border-cyan-500/30 text-white' : 'bg-white/5 border-white/10 text-slate-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-white/10'}`}>
                        {isSelected && <CheckCircle2 size={14} strokeWidth={3} />}
                      </div>
                      <span className="text-xm font-bold flex-1">{menu.name}</span>
                      <ArrowRight size={14} className={isSelected ? 'text-cyan-400' : 'text-slate-800'} />
                    </button>
                  )
                })
              )}
            </div>
            <p className="text-[14px] text-slate-600 mt-4 px-2">※ 選擇此預約項目適用的時間範本。</p>
          </div>
        </div>
      </div>

      {/* Options Editing Modal */}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-1">
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="bg-[#111] border border-white/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative z-10">
            <div className="p-4 pb-2 flex justify-between items-center border-b border-white/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Layout className="text-cyan-400" /> 服務選單編輯
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400"><X size={24} /></button>
            </div>

            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3 mb-6">
                <label className="text-ms font-bold text-slate-300 uppercase tracking-widest pl-1">選單分類名稱</label>
                <input
                  type="text"
                  value={tempOptions.name}
                  onChange={(e) => setTempOptions({ ...tempOptions, name: e.target.value })}
                  placeholder="例如：專業按摩服務、剪髮服務..."
                  className="w-full bg-white/5 border mt-2 border-white/10 rounded-2xl px-2 py-1 text-white font-bold focus:border-cyan-500/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                  <label className="text-ms font-bold text-slate-300 uppercase tracking-widest pl-1">服務項目</label>
                </div>

                <div className="space-y-3">
                  {tempOptions.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-1 items-center bg-white/5 py-1 px-2 rounded-xl border border-white/5 group/row focus-within:border-cyan-500/30 transition-all">
                      <input
                        type="text"
                        value={item.title}
                        placeholder="項目名稱"
                        onChange={(e) => {
                          const newItems = [...tempOptions.items]
                          newItems[idx].title = e.target.value
                          setTempOptions({ ...tempOptions, items: newItems })
                        }}
                        className="flex-1 bg-transparent text-white font-semibold outline-none border-b border-transparent focus:border-cyan-500/50"
                      />
                      <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-xl border border-white/10">
                        <input
                          type="number"
                          value={item.duration}
                          onChange={(e) => {
                            const newItems = [...tempOptions.items]
                            newItems[idx].duration = parseInt(e.target.value) || 0
                            setTempOptions({ ...tempOptions, items: newItems })
                          }}
                          className="w-12 bg-transparent text-center text-white font-mono text-xm outline-none"
                        />
                        <span className="text-slate-600 text-ms">min</span>
                      </div>
                      <button
                        onClick={() => {
                          const newItems = tempOptions.items.filter((_: any, i: number) => i !== idx)
                          setTempOptions({ ...tempOptions, items: newItems })
                        }}
                        className="p-2 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setTempOptions({ ...tempOptions, items: [...tempOptions.items, { title: '', duration: 30 }] })}
                  className="text-ms font-bold text-cyan-400 flex items-center gap-1 hover:text-cyan-300"
                >
                  <Plus size={14} /> 新增項目
                </button>
              </div>
            </div>

            <div className="p-8 pt-4 bg-white/5 flex gap-1">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-slate-400">取消</button>
              <button onClick={handleSaveOptions} className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl font-bold text-white shadow-xl shadow-cyan-500/20">儲存選單</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
