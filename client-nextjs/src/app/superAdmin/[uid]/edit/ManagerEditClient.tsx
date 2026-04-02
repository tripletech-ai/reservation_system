'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { supabaseAdmin } from '@/lib/supabase' // 引入供 Storage 使用
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
  options: { label: string, value: string }[],
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

  const selectedLabels = selected
    .map(val => options.find(o => o.value === val)?.label)
    .filter(Boolean)

  return (
    <div className="space-y-1.5 flex-1 min-w-[200px]">
      <label className="text-[14px] font-black text-slate-300 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-4 py-2 bg-white/5 border rounded-xl text-[13px] font-bold transition-all ${isOpen ? 'border-emerald-500/50 ring-2 ring-emerald-500/10' : 'border-white/10'}`}
        >
          <span className="truncate">{selectedLabels.length > 0 ? selectedLabels.join(', ') : '請挑選...'}</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>


        {isOpen && (
          <>
            <div className="fixed inset-0 z-[80]" onClick={() => setIsOpen(false)} />
            <div
              className="absolute left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 z-[90] max-h-48 overflow-y-auto custom-scrollbar"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all mb-1 ${selected.includes(opt.value) ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/5 text-slate-400'}`}
                >
                  <span className="text-ms font-bold">{opt.label}</span>
                  {selected.includes(opt.value) && <Check size={14} />}
                </button>
              ))}
            </div>
          </>
        )}
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
      instanceId: Math.random().toString(36).substring(2, 9),
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

      {value.map((entry, i) => (
        <NotifyEntryRow
          key={entry.instanceId || i}
          index={i}
          entry={entry}
          procedures={notifyProcedures}
          allOptions={value.map((v, idx) => ({
            label: v.key || `(無關鍵字 #${idx + 1})`,
            value: v.instanceId || ''
          }))}
          onUpdate={update}
          onRemove={() => remove(i)}
        />
      ))}

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

function NotifyEntryRow({ index, entry, procedures, onUpdate, onRemove, allOptions }: any) {
  const [isOpen, setIsOpen] = useState(false)

  const defaultColumnsJson = [
    'line_uid'
  ]

  const newProcedures = [{ uid: 0, name: '自訂義訊息', sample: '', has_text: true, key: '' }, ...procedures];
  // 比對邏輯：優先找 UID 匹配的，找不到則預設為第一筆
  const selectedProc = newProcedures.find((p: any) => p.uid === entry.uid) || newProcedures[0];

  if (selectedProc?.columns_json && typeof selectedProc.columns_json === 'string') {
    try {
      selectedProc.columns_json = JSON.parse(selectedProc.columns_json);
    } catch (e) {
      console.error("JSON 解析失敗:", e);
    }
  }

  return (
    <div
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

        {/* Custom Dropdown */}
        <div className="relative flex-1 max-w-[200px]">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full flex items-center justify-between px-4 py-2 rounded-xl border transition-all text-[13px] font-black uppercase tracking-widest ${isOpen ? 'bg-white/10 border-emerald-500/50 text-emerald-400' : 'bg-white/[0.03] border-white/5 text-slate-300 hover:border-white/20'}`}
          >
            <span className="truncate">{entry.name || '快速選擇範本'}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>


          {isOpen && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
              <div
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
                  {newProcedures.length === 0 && (
                    <div className="p-4 text-center text-[14px] text-slate-600 font-black uppercase tracking-widest">暫無可用範本</div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>

        <button type="button" onClick={onRemove} className="p-2 text-slate-700 hover:text-rose-500 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      {(!selectedProc || selectedProc.has_text) && (<>
        <div className="flex flex-wrap gap-2">
          {/* 1. 靜態預設的欄位 */}
          {defaultColumnsJson.map((item, index) => (
            <span
              key={`default-${index}`}
              // 移除 group-hover:，直接使用 text-emerald-400 (或 green-400)
              className="text-[14px] bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-0.5 font-bold text-emerald-400 transition-colors"
            >
              {`{${item}}`}
            </span>
          ))}

          {/* 2. 動態從 JSON 字串解析出來的欄位 */}
          {selectedProc?.columns_json &&
            selectedProc.columns_json.map((item: string, index: number) => (
              <span
                key={`dynamic-${index}`}
                className="text-[14px] bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-0.5 font-bold text-emerald-400 transition-colors"
              >
                {`{${item}}`}
              </span>
            ))
          }


        </div>
        <label className="text-[14px] font-black text-slate-300 uppercase tracking-widest ml-1">回覆內容</label>
        <textarea
          value={entry.value}
          onChange={(e) => onUpdate(index, { value: e.target.value })}
          placeholder="回覆內容..."
          rows={5}
          className="w-full bg-white/[0.02] border border-white/[0.07] rounded-xl py-3 px-4 text-xm text-slate-300 focus:outline-none focus:border-emerald-500/30 transition-all resize-y font-medium"
        />

          <MultiSelect
            label="需要其他服務嗎？"
            options={allOptions}
            selected={entry.more_keys || []}
            onChange={(v) => onUpdate(index, { more_keys: v })}
          />
      </>

      )}

      {!selectedProc?.has_text && (
        <MultiSelect
          label="未有資料時關鍵字"
          options={allOptions}
          selected={entry.no_data_keys || []}
          onChange={(v) => onUpdate(index, { no_data_keys: v })}
        />
      )}
    </div>
  )
}

// ─── 問卷建構器元件 ────────────────────────────────────────────
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

      {value.map((q, qIdx) => (
        <div
          key={qIdx}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-xm font-black text-purple-500 uppercase tracking-widest whitespace-nowrap">
              Q{qIdx + 1}
            </span>
            <input
              value={q.title}
              onChange={(e) => updateTitle(qIdx, e.target.value)}
              placeholder="題目標題"
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl py-2 px-4 text-base text-white focus:outline-none focus:border-purple-500/40 transition-all font-bold"
            />
            <button
              type="button"
              onClick={() => removeQuestion(qIdx)}
              className="p-2 text-slate-600 hover:text-rose-400 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="pl-8 space-y-2">

            {q.options.map((opt, oIdx) => (
              <div
                key={oIdx}
                className="flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 shrink-0" />
                <input
                  value={opt.title}
                  onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                  placeholder={`選項 ${oIdx + 1}`}
                  className="flex-1 bg-white/[0.02] border border-white/[0.07] rounded-lg py-1.5 px-3 text-xm text-white focus:outline-none focus:border-cyan-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => removeOption(qIdx, oIdx)}
                  className="text-slate-700 hover:text-rose-400 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addOption(qIdx)}
              className="flex items-center gap-1.5 text-xm text-slate-600 hover:text-cyan-400 transition-colors font-bold tracking-wider uppercase mt-1"
            >
              <PlusCircle size={13} /> 新增選項
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/10 rounded-2xl text-ms text-slate-600 hover:text-purple-400 hover:border-purple-500/30 transition-all font-black uppercase tracking-widest"
      >
        <PlusCircle size={16} /> 新增題目
      </button>
    </div>
  )
}

// ─── 區塊折疊元件 ─────────────────────────────────────────────
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
  const colorMap: Record<string, string> = {
    purple: 'text-purple-500',
    cyan: 'text-cyan-500',
    emerald: 'text-emerald-500',
    yellow: 'text-yellow-500',
  }
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all"
      >
        <p className={`text-xm font-black ${colorMap[color] ?? 'text-white'} uppercase tracking-[0.2em]`}>
          {title}
        </p>
        {open ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
      </button>

      {open && (
        <div
          className="overflow-hidden"
        >
          <div className="px-5 pb-5 space-y-4">{children}</div>
        </div>
      )}

    </div>
  )
}

const inputCls =
  'w-full bg-white/[0.05] border border-white/15 rounded-xl py-3 px-4 text-base text-white placeholder:text-slate-300 focus:outline-none focus:border-purple-500/60 transition-all'
const areaCls =
  'w-full bg-white/[0.05] border border-white/15 rounded-xl py-3 px-4 text-base text-white placeholder:text-slate-300 focus:outline-none focus:border-purple-500/60 transition-all resize-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-xm font-extrabold text-white uppercase tracking-wider ml-0.5">
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── 工具：把 NotifyEntry[] 轉 JSON string ────────────────────
function entriesToJson(entries: NotifyEntry[]): string {
  // 在儲存前，將 instanceId 的引用轉回 key 字串
  const processed = entries.map(e => {
    const more_keys = (e.more_keys || [])
      .map(id => entries.find(target => target.instanceId === id)?.key)
      .filter(Boolean) as string[];

    const no_data_keys = (e.no_data_keys || [])
      .map(id => entries.find(target => target.instanceId === id)?.key)
      .filter(Boolean) as string[];

    return { ...e, more_keys, no_data_keys };
  });

  return JSON.stringify(processed.filter(e => e.key.trim() || e.name.trim()), null, 2);
}

function jsonToEntries(raw: unknown): NotifyEntry[] {
  try {
    let data = typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw ?? []);
    if (data && !Array.isArray(data) && typeof data === 'object') {
      data = Object.entries(data).map(([key, value]) => ({
        uid: '',
        key,
        procedure_name: '',
        has_text: true,
        value: String(value),
        name: '',
        sample: '',
        columns_json: ''
      }));
    }

    if (!Array.isArray(data)) return [];

    // 1. 先為每一項分配唯一的 instanceId
    const entries = data.map((e: any) => ({
      ...e,
      instanceId: e.instanceId || Math.random().toString(36).substring(2, 9)
    }));

    // 2. 將儲存的 key 字串引用轉回 instanceId 引用
    return entries.map((e: any) => {
      const more_keys = (e.more_keys || [])
        .map((k: string) => entries.find((target: any) => target.key === k)?.instanceId)
        .filter(Boolean);
      const no_data_keys = (e.no_data_keys || [])
        .map((k: string) => entries.find((target: any) => target.key === k)?.instanceId)
        .filter(Boolean);
      return { ...e, more_keys, no_data_keys };
    });
  } catch {
    return [];
  }
}

// ─── 主頁面 ────────────────────────────────────────────────────
export default function ManagerEditPage() {
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
      try {
        const raw = found.questionnaire
        const q = typeof raw === 'string' ? JSON.parse(raw || '[]') : (Array.isArray(raw) ? raw : [])
        setQuestionnaire(Array.isArray(q) ? q : [])
      } catch { setQuestionnaire([]) }
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

      // ─── 手動處理 Logo 上傳至 Supabase ──────────────────────────
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `logos/${fileName}`

        const { error: uploadError } = await supabaseAdmin.storage
          .from('logos')
          .upload(filePath, logoFile)

        if (uploadError) throw new Error(`Logo 上傳失敗: ${uploadError.message}`)

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('logos')
          .getPublicUrl(filePath)

        payload.logo_url = publicUrl
      } else {
        payload.logo_url = logoPreview // 保留原有的 URL
      }

      if (!isNew) payload.uid = manager.uid
      payload.questionnaire = JSON.stringify(questionnaire)
      payload.line_notify_content = entriesToJson(notifyEntries)

      // ─── 密碼加密處理 ──────────────────────────
      if (isNew) {
        // 新建帳號：必填密碼並加密
        payload.password = await hashPassword(payload.password)
      } else {
        // 編輯帳號：只有當密碼欄位有填寫時才加密並更新
        if (payload.password && payload.password.trim() !== "") {
          payload.password = await hashPassword(payload.password)
        } else {
          delete payload.password // 移除欄位，不更新資料庫中的密碼
        }
      }

      const res = await upsertManager(payload)
      if (res.success) {
        router.push('/superAdmin')
      } else {
        showAlert({ message: res.message || '儲存失敗', type: 'error' })
      }
    } catch (err: any) {
      console.error(err)
      showAlert({ message: err.message || '發生未知錯誤', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={48} strokeWidth={1} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500/30">
      <div className="fixed top-0 right-0 w-[40vw] h-[40vw] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[40vw] h-[40vw] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/superAdmin')}
              className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white italic tracking-tighter uppercase">
                {isNew ? '建立管理員' : '編輯管理員'}
              </h1>
              <p className="text-slate-300 font-bold text-ms uppercase tracking-[0.3em]">
                {isNew ? 'New Manager' : manager?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/superAdmin')}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-ms font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-slate-400"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="max-w-3xl mx-auto px-6 py-8 space-y-4 relative z-10">

        {/* 基本資料 */}
        <Section title="基本資料" color="purple">
          <div className="grid grid-cols-2 gap-4">
            <Field label="展示名稱">
              <input name="name" defaultValue={manager?.name} required className={inputCls} />
            </Field>
            <Field label="登入帳號">
              <input name="account" defaultValue={manager?.account} required className={`${inputCls} font-mono`} />
            </Field>
            <Field label="密碼">
              <input
                name="password"
                type="text"
                required={isNew}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="專屬網址碼">
              <input name="website_name" defaultValue={manager?.website_name} required className={`${inputCls} font-mono`} />
            </Field>
            <Field label="Logo 上傳">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 overflow-hidden shrink-0">
                      <img src={logoPreview} className="w-full h-full object-cover" alt="Preview" />
                    </div>
                  )}
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setLogoFile(file)
                          setLogoPreview(URL.createObjectURL(file))
                        }
                      }}
                    />
                    <div className="cursor-pointer bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ms font-bold text-slate-400 hover:bg-white/10 transition-all text-center">
                      {logoFile ? logoFile.name : '選取圖片檔案...'}
                    </div>
                  </label>
                </div>
              </div>
            </Field>
            <Field label="權限等級 (1:最高權限, 0:一般管理員)">
              <input name="level" type="number" defaultValue={manager?.level ?? 0} min={0} max={1} className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* 金融資訊 */}
        <Section title="金融資訊" color="cyan" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="銀行名稱">
              <input name="bank_name" defaultValue={manager?.bank_name} placeholder="如: 玉山銀行" className={inputCls} />
            </Field>
            <Field label="銀行帳號">
              <input name="bank_account" defaultValue={manager?.bank_account} placeholder="帳號後5碼" className={`${inputCls} font-mono`} />
            </Field>
            <div className="col-span-2">
              <Field label="帳戶名稱">
                <input name="bank_account_owner" defaultValue={manager?.bank_account_owner} placeholder="如: 王小明" className={inputCls} />
              </Field>
            </div>
          </div>
        </Section>

        {/* LINE / Google 整合 */}
        <Section title="LINE / Google 整合" color="emerald" defaultOpen={false}>
          <Field label="LINE Channel Access Token">
            <input name="line_channel_access_token" defaultValue={manager?.line_channel_access_token} placeholder="Bearer token..." className={`${inputCls} font-mono text-ms`} />
          </Field>
          <Field label="Google Calendar ID">
            <input name="google_calendar_id" defaultValue={manager?.google_calendar_id} placeholder="xxxx@group.calendar.google.com" className={`${inputCls} font-mono text-ms`} />
          </Field>
        </Section>

        {/* LINE Notify 關鍵字回覆 */}
        <Section title="LINE Notify 關鍵字回覆" color="emerald">
          <p className="text-ms text-slate-300">
            設定聊天機器人的關鍵字觸發回覆，每筆為一組「關鍵字 → 回覆內容」
          </p>
          <LineNotifyBuilder value={notifyEntries} onChange={setNotifyEntries} />

          {/* line_notify_default */}
          <Field label="預設回覆（查無關鍵字時）">
            <textarea
              name="line_notify_default"
              defaultValue={manager?.line_notify_default ?? ''}
              placeholder="查無此關鍵字，請重新輸入或洽詢客服。"
              rows={5}
              className={areaCls}
            />
          </Field>
        </Section>

        {/* 問卷 */}
        <Section title="會員註冊問卷題目" color="yellow" defaultOpen={false}>
          <QuestionnaireBuilder value={questionnaire} onChange={setQuestionnaire} />
        </Section>

        {/* Submit */}
        <div className="pt-2 pb-10">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-gradient-to-br from-purple-600 to-cyan-600 py-4 rounded-2xl text-white font-black text-xm uppercase tracking-widest shadow-xl shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> 儲存變更</>}
          </button>
        </div>
      </form>
    </div>
  )
}
