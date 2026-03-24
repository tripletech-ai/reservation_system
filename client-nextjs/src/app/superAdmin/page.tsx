'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, Search, Edit3, Trash2, X, Shield, User,
  ExternalLink, Save, Loader2, Globe, Settings, Zap,
  PlusCircle, MinusCircle, ChevronDown, ChevronUp
} from 'lucide-react'
import { getAllManagers, upsertManager, deleteManager } from '@/app/actions/superManagers'
import { getSuperSession, superLogoutAction } from '@/app/actions/superAuth'

// ─── 問卷題目型別 ────────────────────────────────────────────
type QOption = { title: string }
type QItem = { title: string; options: QOption[] }

// ─── 問卷建構器元件 ────────────────────────────────────────────
function QuestionnaireBuilder({
  value,
  onChange
}: {
  value: QItem[]
  onChange: (v: QItem[]) => void
}) {
  const addQuestion = () =>
    onChange([...value, { title: '', options: [] }])

  const removeQuestion = (idx: number) =>
    onChange(value.filter((_, i) => i !== idx))

  const updateTitle = (idx: number, title: string) => {
    const next = [...value]
    next[idx] = { ...next[idx], title }
    onChange(next)
  }

  const addOption = (qIdx: number) => {
    const next = [...value]
    next[qIdx] = { ...next[qIdx], options: [...next[qIdx].options, { title: '' }] }
    onChange(next)
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    const next = [...value]
    next[qIdx] = { ...next[qIdx], options: next[qIdx].options.filter((_, i) => i !== oIdx) }
    onChange(next)
  }

  const updateOption = (qIdx: number, oIdx: number, title: string) => {
    const next = [...value]
    next[qIdx].options[oIdx] = { title }
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {value.map((q, qIdx) => (
          <motion.div
            key={qIdx}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3"
          >
            {/* 題目標題 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-purple-500 uppercase tracking-widest whitespace-nowrap">Q{qIdx + 1}</span>
              <input
                value={q.title}
                onChange={(e) => updateTitle(qIdx, e.target.value)}
                placeholder="題目標題"
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all font-bold"
              />
              <button
                type="button"
                onClick={() => removeQuestion(qIdx)}
                className="p-2 text-slate-600 hover:text-rose-400 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {/* 選項列表 */}
            <div className="pl-8 space-y-2">
              <AnimatePresence>
                {q.options.map((opt, oIdx) => (
                  <motion.div
                    key={oIdx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 shrink-0" />
                    <input
                      value={opt.title}
                      onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                      placeholder={`選項 ${oIdx + 1}`}
                      className="flex-1 bg-white/[0.02] border border-white/[0.07] rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(qIdx, oIdx)}
                      className="text-slate-700 hover:text-rose-400 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => addOption(qIdx)}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-cyan-400 transition-colors font-bold tracking-wider uppercase mt-1"
              >
                <PlusCircle size={13} /> 新增選項
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <button
        type="button"
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/10 rounded-2xl text-xs text-slate-600 hover:text-purple-400 hover:border-purple-500/30 transition-all font-black uppercase tracking-widest"
      >
        <PlusCircle size={16} /> 新增題目
      </button>
    </div>
  )
}

// ─── 共用常數 & 元件 ───────────────────────────────────────────
const inputCls = 'w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-black text-slate-300 uppercase tracking-widest italic ml-0.5">{label}</label>
      {children}
    </div>
  )
}

// ─── 主頁面 ────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [selectedManager, setSelectedManager] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [questionnaire, setQuestionnaire] = useState<QItem[]>([])
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const session = await getSuperSession()
      if (!session) { router.push('/superAdmin/login'); return }
      loadManagers()
    }
    checkSession()
  }, [])

  const loadManagers = async () => {
    setLoading(true)
    const data = await getAllManagers()
    setManagers(data)
    setLoading(false)
  }

  const filteredManagers = managers.filter(m =>
    m.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
    m.account?.toLowerCase().includes(searchValue.toLowerCase()) ||
    m.website_name?.toLowerCase().includes(searchValue.toLowerCase())
  )


  const handleOpenModal = (manager: any = null) => {
    setSelectedManager(manager || { name: '', account: '', password: '', logo_url: '/logo.png', website_name: '' })
    if (manager) {
      try {
        const raw = manager.questionnaire
        const q = typeof raw === 'string' ? JSON.parse(raw || '[]') : (Array.isArray(raw) ? raw : [])
        setQuestionnaire(Array.isArray(q) ? q : [])
      } catch {
        setQuestionnaire([])
      }
    } else {
      setQuestionnaire([])
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    const payload: any = Object.fromEntries(formData.entries())
    if (selectedManager?.uid) payload.uid = selectedManager.uid
    payload.questionnaire = JSON.stringify(questionnaire)

    const res = await upsertManager(payload)
    if (res.success) {
      setIsModalOpen(false)
      loadManagers()
    } else {
      alert(res.message || '儲存失敗')
    }
    setIsSaving(false)
  }

  const handleDelete = async (uid: string) => {
    if (!confirm('確定要刪除此管理員嗎？')) return
    const res = await deleteManager(uid)
    if (res.success) loadManagers()
    else alert(res.message || '刪除失敗')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 font-sans selection:bg-purple-500/30">
      <div className="fixed top-0 right-0 w-[40vw] h-[40vw] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[40vw] h-[40vw] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-xl shadow-purple-500/20 ring-2 ring-white/5">
            <Shield className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter italic uppercase">
              Triple <span className="text-purple-500">Super</span> Dashboard
            </h1>
            <p className="text-slate-300 text-sm font-bold tracking-[0.3em] uppercase opacity-70">System Management Authority</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => { await superLogoutAction(); router.push('/superAdmin/login') }}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all active:scale-95 text-slate-400"
          >
            登出
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-500/30"
          >
            <UserPlus size={14} /> 建立管理員
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto relative z-10">
        {/* Search */}
        <div className="mb-6 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={16} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜尋管理員姓名、帳號或網站名稱..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-purple-500/40 focus:bg-white/[0.05] transition-all placeholder-slate-600"
          />
        </div>

        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-4 opacity-30">
            <Loader2 className="animate-spin text-purple-500" size={48} strokeWidth={1} />
            <p className="text-xs font-black tracking-widest uppercase">載入中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence>
              {filteredManagers.map((manager, idx) => (
                <motion.div
                  key={manager.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="group relative bg-white/[0.02] border border-white/10 rounded-3xl p-6 hover:bg-white/[0.04] hover:border-purple-500/30 transition-all duration-500 shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-600/10 to-transparent border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center p-3">
                      {manager.logo_url ? (
                        <img src={manager.logo_url} alt={manager.name} className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500" />
                      ) : (
                        <User size={24} className="text-slate-700" />
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleOpenModal(manager)} className="p-2 bg-white/5 rounded-xl hover:bg-purple-600 hover:text-white transition-all text-slate-400">
                        <Edit3 size={15} />
                      </button>
                      {manager.level == 0 && (
                        <button onClick={() => handleDelete(manager.uid)} className="p-2 bg-white/5 rounded-xl hover:bg-rose-600 hover:text-white transition-all text-slate-400">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div>
                      <h2 className="text-lg font-black text-white italic tracking-tight">{manager.name}</h2>
                      <p className="text-slate-300 font-mono text-sm uppercase tracking-widest mt-0.5">@{manager.account}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 py-3 px-4 bg-white/[0.03] border border-white/5 rounded-xl">
                        <Globe size={14} className="text-cyan-500 shrink-0" />
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm text-slate-300 uppercase font-bold tracking-widest">網站識別碼</p>
                          <p className="text-xs font-bold text-slate-300 truncate">{manager.website_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 py-3 px-4 bg-white/[0.03] border border-white/5 rounded-xl">
                        <Settings size={14} className="text-purple-500 shrink-0" />
                        <div>
                          <p className="text-sm text-slate-300 uppercase font-bold tracking-widest">問卷題目數</p>
                          <p className="text-xs font-bold text-slate-300">
                            {(() => {
                              try {
                                const raw = manager.questionnaire
                                const q = typeof raw === 'string' ? JSON.parse(raw || '[]') : (Array.isArray(raw) ? raw : [])
                                return q.length
                              } catch { return 0 }
                            })()} 題
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-2xl bg-[#0f0f0f] border border-white/20 rounded-[2rem] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <form onSubmit={handleSave} className="flex flex-col min-h-0">
                {/* Modal Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                      <Zap size={22} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">
                        {selectedManager?.uid ? '編輯管理員' : '建立管理員'}
                      </h2>
                      <p className="text-slate-300 font-bold text-sm uppercase tracking-[0.3em]">Manager Access Profile</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-300 hover:text-white">
                    <X size={22} />
                  </button>
                </div>

                {/* Modal Body - scrollable */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">

                  {/* 基本資料 */}
                  <div>
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-3">基本資料</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="展示名稱"><input name="name" defaultValue={selectedManager?.name} required placeholder="如: 極速美業店" className={inputCls} /></Field>
                      <Field label="登入帳號"><input name="account" defaultValue={selectedManager?.account} required placeholder="admin_fast" className={`${inputCls} font-mono`} /></Field>
                      <Field label="帳號密碼"><input name="password" type="password" defaultValue={selectedManager?.password} required={!selectedManager?.uid} placeholder={selectedManager?.uid ? '若不修改請留空' : '••••••••'} className={`${inputCls} font-mono`} /></Field>
                      <Field label="專屬網址碼"><input name="website_name" defaultValue={selectedManager?.website_name} required placeholder="my-shop-id" className={`${inputCls} font-mono`} /></Field>
                      <Field label="Logo 連結"><input name="logo_url" defaultValue={selectedManager?.logo_url} placeholder="/logo.png" className={`${inputCls} font-mono`} /></Field>
                      <Field label="權限等級 (level)"><input name="level" type="number" defaultValue={selectedManager?.level ?? 1} min={1} max={9} className={inputCls} /></Field>
                    </div>
                  </div>

                  {/* 金融資訊 */}
                  <div>
                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-3">金融資訊</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="銀行名稱"><input name="bank_name" defaultValue={selectedManager?.bank_name} placeholder="如: 玉山銀行" className={inputCls} /></Field>
                      <Field label="銀行帳號"><input name="bank_account" defaultValue={selectedManager?.bank_account} placeholder="帳號後5碼" className={`${inputCls} font-mono`} /></Field>
                      <div className="col-span-2">
                        <Field label="帳戶名稱"><input name="bank_account_owner" defaultValue={selectedManager?.bank_account_owner} placeholder="如: 王小明" className={inputCls} /></Field>
                      </div>
                    </div>
                  </div>

                  {/* LINE / Google 整合 */}
                  <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-3">LINE / Google 整合</p>
                    <div className="space-y-3">
                      <Field label="LINE Notify 訊息內容"><input name="line_notify_content" defaultValue={selectedManager?.line_notify_content} placeholder="預約成功通知文字..." className={inputCls} /></Field>
                      <Field label="LINE Channel Access Token"><input name="line_channel_access_token" defaultValue={selectedManager?.line_channel_access_token} placeholder="Bearer token..." className={`${inputCls} font-mono text-xs`} /></Field>
                      <Field label="Google Calendar ID"><input name="google_calendar_id" defaultValue={selectedManager?.google_calendar_id} placeholder="xxxx@group.calendar.google.com" className={`${inputCls} font-mono text-xs`} /></Field>
                      <Field label="Google Calendar Access Token"><input name="google_calendar_access_token" defaultValue={selectedManager?.google_calendar_access_token} placeholder="ya29.xxx..." className={`${inputCls} font-mono text-xs`} /></Field>
                    </div>
                  </div>

                  {/* Questionnaire Builder */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em]">會員註冊問卷題目</p>
                    <QuestionnaireBuilder value={questionnaire} onChange={setQuestionnaire} />
                  </div>
                </div>


                {/* Modal Footer */}
                <div className="p-6 pt-0 flex gap-3 shrink-0">
                  <button type="submit" disabled={isSaving}
                    className="flex-[2] bg-gradient-to-br from-purple-600 to-cyan-600 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> 儲存變更</>}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    取消
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
