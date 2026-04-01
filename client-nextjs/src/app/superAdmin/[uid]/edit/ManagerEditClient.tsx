'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save, Loader2, X, Zap, ArrowLeft,
  PlusCircle, Trash2,
  ChevronDown, ChevronUp, Check
} from 'lucide-react'
import {
  getAllManagers,
  upsertManager,
} from '@/app/actions/superManagers'
import { getSession } from '@/app/actions/superAuth'
import { useSuperAdmin } from '../../SuperAdminContext'
import { NotifyEntry, QItem } from '@/types'
import { useAlert } from '@/components/ui/DialogProvider'
import { supabaseAdmin } from '@/lib/supabase' 
import { hashPassword } from '@/lib/auth'
import { ROUTES } from '@/constants/routes'
import { MANAGER_LEVEL } from '@/constants/common'

// ─── 多選下拉選單組件 ──────────────────────────────────────────
function MultiSelect({
  label,
  options,
  selected,
  onChange
}: {
  label: string,
  options: string[],
  selected: string[],
  onChange: (v: string[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(s => s !== val))
    } else {
      onChange([...selected, val])
    }
  }

  return (
    <div className="space-y-1.5 flex-1 min-w-[200px]">
      <label className="text-[14px] font-black text-slate-300 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-4 py-2 bg-white/5 border rounded-xl text-[13px] font-bold transition-all ${isOpen ? 'border-emerald-500/50 ring-2 ring-emerald-500/10' : 'border-white/10'}`}
        >
          <span className="truncate">{selected.length > 0 ? `已選 ${selected.length} 項` : '請挑選...'}</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-[80]" onClick={() => setIsOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 z-[90] max-h-48 overflow-y-auto custom-scrollbar"
              >
                {options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all mb-1 ${selected.includes(opt) ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/5 text-slate-400'}`}
                  >
                    <span className="text-ms font-bold">{opt}</span>
                    {selected.includes(opt) && <Check size={14} />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function LineNotifyBuilder({
  value,
  onChange,
}: {
  value: NotifyEntry[]
  onChange: (v: NotifyEntry[]) => void
}) {
  const { notifyProcedures } = useSuperAdmin()
  const addEntry = () => {
    onChange([...value, {
      uid: 0,
      key: '',
      name: '自訂義訊息',
      value: '',
      sample: '',
      has_text: true,
      procedure_name: '',
      columns_json: JSON.stringify(['line_uid'])
    } as any])
  }
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const update = (i: number, nextEntry: Partial<NotifyEntry>) => {
    const next = [...value]
    next[i] = { ...next[i], ...nextEntry }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {value.map((entry, i) => (
          <NotifyEntryRow
            key={i}
            index={i}
            entry={entry}
            procedures={notifyProcedures}
            allKeys={value.map(v => v.key).filter(k => k.trim())}
            onUpdate={update}
            onRemove={() => remove(i)}
          />
        ))}
      </AnimatePresence>
      <button
        type="button"
        onClick={addEntry}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/10 rounded-2xl text-ms text-slate-600 hover:text-emerald-400 hover:border-emerald-500/30 transition-all font-black uppercase tracking-widest"
      >
        <PlusCircle size={16} /> 新增關鍵字回覆
      </button>
    </div>
  )
}

function NotifyEntryRow({ index, entry, procedures, onUpdate, onRemove, allKeys }: any) {
  const [isOpen, setIsOpen] = useState(false)
  const defaultColumnsJson = ['line_uid']
  const newProcedures = [{ uid: 0, name: '自訂義訊息', sample: '', has_text: true, key: '' }, ...procedures];
  const selectedProc = newProcedures.find((p: any) => p.uid === entry.uid) || newProcedures[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
      className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4 relative"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-black text-emerald-500/50 uppercase tracking-[0.2em]">#{index + 1}</span>
          <div className="relative group">
            <input
              value={selectedProc?.key || entry.key}
              readOnly={selectedProc?.key}
              onChange={(e) => onUpdate(index, { key: e.target.value })}
              placeholder="關鍵字"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-base text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all font-black placeholder:text-slate-700 w-40 shadow-inner"
            />
          </div>
        </div>

        <div className="relative flex-1 max-w-[200px]">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full flex items-center justify-between px-4 py-2 rounded-xl border transition-all text-[13px] font-black uppercase tracking-widest ${isOpen ? 'bg-white/10 border-emerald-500/50 text-emerald-400' : 'bg-white/[0.03] border-white/5 text-slate-300 hover:border-white/20'}`}
          >
            <span className="truncate">{entry.name || '快速選擇範本'}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-2 z-[70] overflow-hidden backdrop-blur-xl"
                >
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {newProcedures.map((p: any) => (
                      <button
                        key={p.uid}
                        type="button"
                        onClick={() => {
                          onUpdate(index, {
                            name: p.name,
                            value: p.sample || "",
                            has_text: p.has_text,
                            procedure_name: p.procedure_name,
                            uid: p.uid,
                            ...(p.key && { key: p.key })
                          })
                          setIsOpen(false)
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
                      >
                        <span className={`text-ms font-bold ${selectedProc?.uid === p.uid ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`}>
                          {p.name}
                        </span>
                        {selectedProc?.uid === p.uid && <Check size={14} className="text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <button type="button" onClick={onRemove} className="p-2 text-slate-700 hover:text-rose-500 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      {(!selectedProc || selectedProc.has_text) && (<>
        <div className="flex flex-wrap gap-2">
          {defaultColumnsJson.map((item, index) => (
            <span key={`default-${index}`} className="text-[14px] bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-0.5 font-bold text-emerald-400">
              {`{${item}}`}
            </span>
          ))}
        </div>
        <label className="text-[14px] font-black text-slate-300 uppercase tracking-widest ml-1">回覆內容</label>
        <textarea
          value={entry.value}
          onChange={(e) => onUpdate(index, { value: e.target.value })}
          placeholder="回覆內容..." rows={5}
          className="w-full bg-white/[0.02] border border-white/[0.07] rounded-xl py-3 px-4 text-xm text-slate-300 focus:outline-none focus:border-emerald-500/30 transition-all resize-y font-medium"
        />
        <div className="flex flex-wrap gap-4 mt-2">
          <MultiSelect label="需要其他服務嗎？" options={allKeys} selected={entry.more_keys || []} onChange={(v) => onUpdate(index, { more_keys: v })} />
        </div>
      </>)}

      {!selectedProc?.has_text && (
        <MultiSelect label="未有資料時關鍵字" options={allKeys} selected={entry.no_data_keys || []} onChange={(v) => onUpdate(index, { no_data_keys: v })} />
      )}
    </motion.div>
  )
}

function QuestionnaireBuilder({
  value,
  onChange,
}: {
  value: QItem[]
  onChange: (v: QItem[]) => void
}) {
  const addQuestion = () => onChange([...value, { title: '', options: [] }])
  const removeQuestion = (idx: number) => onChange(value.filter((_, i) => i !== idx))
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
            <div className="flex items-center gap-2">
              <span className="text-xm font-black text-purple-500 uppercase tracking-widest whitespace-nowrap">Q{qIdx + 1}</span>
              <input value={q.title} onChange={(e) => updateTitle(qIdx, e.target.value)} placeholder="題目標題" className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl py-2 px-4 text-base text-white focus:outline-none focus:border-purple-500/40 transition-all font-bold" />
              <button type="button" onClick={() => removeQuestion(qIdx)} className="p-2 text-slate-600 hover:text-rose-400 transition-colors"><Trash2 size={15} /></button>
            </div>
            <div className="pl-8 space-y-2">
              <AnimatePresence>
                {q.options.map((opt, oIdx) => (
                  <motion.div key={oIdx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 shrink-0" />
                    <input value={opt.title} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} placeholder={`選項 ${oIdx + 1}`} className="flex-1 bg-white/[0.02] border border-white/[0.07] rounded-lg py-1.5 px-3 text-xm text-white focus:outline-none focus:border-cyan-500/30 transition-all" />
                    <button type="button" onClick={() => removeOption(qIdx, oIdx)} className="text-slate-700 hover:text-rose-400 transition-colors"><X size={13} /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button type="button" onClick={() => addOption(qIdx)} className="flex items-center gap-1.5 text-xm text-slate-600 hover:text-cyan-400 transition-colors font-bold tracking-wider uppercase mt-1"><PlusCircle size={13} /> 新增選項</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button type="button" onClick={addQuestion} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/10 rounded-2xl text-ms text-slate-600 hover:text-purple-400 hover:border-purple-500/30 transition-all font-black uppercase tracking-widest"><PlusCircle size={16} /> 新增題目</button>
    </div>
  )
}

function Section({
  title,
  color = 'purple',
  children,
  defaultOpen = true,
}: {
  title: string
  color?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const colorMap: Record<string, string> = { purple: 'text-purple-500', cyan: 'text-cyan-500', emerald: 'text-emerald-500', yellow: 'text-yellow-500' }
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all">
        <p className={`text-xm font-black ${colorMap[color] ?? 'text-white'} uppercase tracking-[0.2em]`}>{title}</p>
        {open ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
      </button>
      <AnimatePresence>
        {open && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"><div className="px-5 pb-5 space-y-4">{children}</div></motion.div>)}
      </AnimatePresence>
    </div>
  )
}

const inputCls = 'w-full bg-white/[0.05] border border-white/15 rounded-xl py-3 px-4 text-base text-white placeholder:text-slate-300 focus:outline-none focus:border-purple-500/60 transition-all'
const areaCls = 'w-full bg-white/[0.05] border border-white/15 rounded-xl py-3 px-4 text-base text-white placeholder:text-slate-300 focus:outline-none focus:border-purple-500/60 transition-all resize-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-xm font-extrabold text-white uppercase tracking-wider ml-0.5">{label}</label>
      {children}
    </div>
  )
}

function entriesToJson(entries: NotifyEntry[]): string {
  return JSON.stringify(entries.filter(e => e.key.trim() || e.name.trim()), null, 2);
}

function jsonToEntries(raw: unknown): NotifyEntry[] {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw ?? []);
    if (data && !Array.isArray(data) && typeof data === 'object') {
      return Object.entries(data).map(([key, value]) => ({ uid: '', key, procedure_name: '', has_text: true, value: String(value), name: '', sample: '', columns_json: '' }));
    }
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export default function ManagerEditClient() {
  const router = useRouter()
  const params = useParams()
  const isNew = params.uid === 'new'
  const { showAlert } = useAlert()
  const [manager, setManager] = useState<any>(null)
  const [loading, setLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [questionnaire, setQuestionnaire] = useState<QItem[]>([])
  const [notifyEntries, setNotifyEntries] = useState<NotifyEntry[]>([])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')

  useEffect(() => {
    async function init() {
      const session = await getSession(MANAGER_LEVEL.SUPER)
      if (!session) { router.push(ROUTES.SUPER_ADMIN.LOGIN); return }
      if (isNew) {
        setManager({ name: '', account: '', password: '', logo_url: '/logo.png', website_name: '' })
        setLoading(false)
        return
      }
      const all = await getAllManagers()
      const found = all.find((m: any) => m.uid === params.uid)
      if (!found) { router.push(ROUTES.SUPER_ADMIN.HOME); return }
      setManager(found)
      setLogoPreview(found.logo_url)
      setQuestionnaire(Array.isArray(found.questionnaire) ? found.questionnaire : JSON.parse(found.questionnaire || '[]'))
      setNotifyEntries(jsonToEntries(found.line_notify_content))
      setLoading(false)
    }
    init()
  }, [])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      const payload: any = Object.fromEntries(formData.entries())
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `logos/${fileName}`
        const { error: uploadError } = await supabaseAdmin.storage.from('logos').upload(filePath, logoFile)
        if (uploadError) throw new Error(uploadError.message)
        payload.logo_url = supabaseAdmin.storage.from('logos').getPublicUrl(filePath).data.publicUrl
      } else { payload.logo_url = logoPreview }

      if (!isNew) payload.uid = manager.uid
      payload.questionnaire = JSON.stringify(questionnaire)
      payload.line_notify_content = entriesToJson(notifyEntries)
      if (isNew) { payload.password = await hashPassword(payload.password) }
      else if (payload.password?.trim()) { payload.password = await hashPassword(payload.password) }
      else { delete payload.password }

      const res = await upsertManager(payload)
      if (res.success) router.push('/superAdmin')
      else showAlert({ message: res.message || '儲存失敗', type: 'error' })
    } catch (err: any) { showAlert({ message: err.message || '發生錯誤', type: 'error' }) }
    finally { setIsSaving(false) }
  }

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={48} /></div>

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.push('/superAdmin')} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400"><ArrowLeft size={20} /></button>
            <div><h1 className="text-lg font-black italic tracking-tighter uppercase">{isNew ? '建立管理員' : '編輯管理員'}</h1></div>
          </div>
        </div>
      </div>
      <form onSubmit={handleSave} className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <Section title="基本資料" color="purple">
          <div className="grid grid-cols-2 gap-4">
            <Field label="展示名稱"><input name="name" defaultValue={manager?.name} required className={inputCls} /></Field>
            <Field label="登入帳號"><input name="account" defaultValue={manager?.account} required className={inputCls} /></Field>
            <Field label="密碼"><input name="password" type="text" required={isNew} className={inputCls} /></Field>
            <Field label="專屬網址碼"><input name="website_name" defaultValue={manager?.website_name} required className={inputCls} /></Field>
          </div>
        </Section>
        <Section title="LINE Notify 關鍵字回覆" color="emerald"><LineNotifyBuilder value={notifyEntries} onChange={setNotifyEntries} /></Section>
        <div className="pt-2 pb-10"><button type="submit" disabled={isSaving} className="w-full bg-gradient-to-br from-purple-600 to-cyan-600 py-4 rounded-2xl text-white font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">{isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> 儲存變更</>}</button></div>
      </form>
    </div>
  )
}
