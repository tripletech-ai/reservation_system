'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserPlus, Search, Edit3, Trash2, Shield, User,
  Globe, Settings
} from 'lucide-react'
import { deleteManager } from '@/app/actions/superManagers'
import { logoutAction } from '@/app/actions/superAuth'
import { useAlert } from '@/components/ui/DialogProvider'
import { CONFIG_ENV } from '@/lib/env'
import CopyButton from '@/components/ui/CopyButton'
import { ROUTES } from '@/constants/routes'
import { MANAGER_LEVEL } from '@/constants/common'

interface SuperAdminClientProps {
  initialManagers: any[]
}

export default function SuperAdminClient({ initialManagers }: SuperAdminClientProps) {
  const [managers, setManagers] = useState(initialManagers)
  const [searchValue, setSearchValue] = useState('')
  const router = useRouter()
  const { showAlert, showConfirm } = useAlert()

  const shareLink = CONFIG_ENV.services.lineNotifyEdge;

  const filteredManagers = managers.filter(m =>
    m.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
    m.account?.toLowerCase().includes(searchValue.toLowerCase()) ||
    m.website_name?.toLowerCase().includes(searchValue.toLowerCase())
  )

  const handleDelete = async (uid: string) => {
    const isConfirmed = await showConfirm({
      message: '確定要刪除此管理員嗎？',
      type: 'warning',
      confirmText: '確定刪除',
      cancelText: '取消'
    })
    if (!isConfirmed) return
    const res = await deleteManager(uid)
    if (res.success) {
      setManagers(prev => prev.filter(m => m.uid !== uid))
    } else {
      showAlert({ message: res.message || '刪除失敗', type: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 font-sans selection:bg-purple-500/30">
      <div className="fixed top-0 right-0 w-[40vw] h-[40vw] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[40vw] h-[40vw] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between mb-10 gap-6 relative z-10">
        <div className="flex items-center gap-4 group">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-[0_15px_30px_-10px_rgba(147,51,234,0.5)] ring-2 ring-white/10 group-hover:scale-110 transition-transform duration-500">
            <Shield className="text-white w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-white tracking-widest italic uppercase">
              超級 <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">管理員</span>
            </h1>
            <p className="text-slate-300 text-[14px] font-black tracking-[0.4em] uppercase opacity-70">內部系統，用於管理員帳號與權限</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={async () => { await logoutAction(MANAGER_LEVEL.SUPER); router.push(ROUTES.SUPER_ADMIN.LOGIN) }}
            className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[14px] font-black uppercase tracking-widest hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all active:scale-95 text-slate-400 shadow-lg"
          >
            登出
          </button>
          <button
            onClick={() => router.push(`${ROUTES.SUPER_ADMIN.MANAGER_NEW}`)}
            className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-2xl font-black text-[14px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-[0_15px_40px_-5px_rgba(147,51,234,0.6)] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-purple-500/30 border border-white/10"
          >
            <UserPlus size={16} /> 建立管理員
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto relative z-10">
        {/* Search */}
        <div className="mb-10 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors duration-300" size={20} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜尋管理員姓名、帳號、網站識別識別碼..."
            className="w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] py-5.5 pl-14 pr-6 text-white font-bold outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all placeholder-slate-600 shadow-inner text-base"
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/5 px-2 py-1 rounded-md border border-white/5 text-[14px] text-slate-600 font-mono tracking-tighter uppercase hidden sm:block">
            搜尋
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredManagers.map((manager) => (
            <div
              key={manager.uid}
              className="group relative bg-white/[0.02] border border-white/10 rounded-3xl p-6 hover:bg-white/[0.04] hover:border-purple-500/30 transition-all duration-500 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div className="w-16 h-16 bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
                  {manager.logo_url ? (
                    <img
                      src={manager.logo_url}
                      alt={manager.name}
                      className="w-full h-full object-cover filter contrast-[1.1] transition-all duration-500"
                    />
                  ) : (
                    <User size={32} className="text-slate-600" />
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`${ROUTES.SUPER_ADMIN.MANAGER_EDIT(manager.uid)}`)} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-purple-600/40 hover:text-white hover:border-purple-500 transition-all text-slate-400 active:scale-90">
                    <Edit3 size={18} />
                  </button>
                  {manager.level == 0 && (
                    <button onClick={() => handleDelete(manager.uid)} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-rose-600/40 hover:text-white hover:border-rose-500 transition-all text-slate-400 active:scale-90">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-8 space-y-6 relative z-10">
                <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter leading-none mb-1 uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent group-hover:to-white transition-all">{manager.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-glow shadow-purple-500/50" />
                    <p className="text-slate-300 font-black text-[13px] uppercase tracking-[0.25em]">@{manager.account}</p>
                  </div>
                  <div className="flex items-center mt-2">
                    <CopyButton text={`${shareLink}?uid=${manager.uid}`} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 py-4 px-5 bg-white/[0.05] border border-white/5 rounded-2xl transition-all group-hover:bg-white/[0.08] shadow-inner">
                    <Globe size={18} className="text-cyan-400 shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[14px] text-slate-300 font-black uppercase tracking-widest mb-0.5 opacity-60">網站名稱</p>
                      <p className="text-xm font-black text-slate-200 truncate font-mono italic">{manager.website_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 py-4 px-5 bg-white/[0.05] border border-white/5 rounded-2xl transition-all group-hover:bg-white/[0.08] shadow-inner">
                    <Settings size={18} className="text-purple-400 shrink-0" />
                    <div>
                      <p className="text-[14px] text-slate-300 font-black uppercase tracking-widest mb-0.5 opacity-60">問卷題目</p>
                      <p className="text-xm font-black text-slate-200 italic">
                        {(() => {
                          try {
                            const raw = manager.questionnaire
                            const q = typeof raw === 'string' ? JSON.parse(raw || '[]') : (Array.isArray(raw) ? raw : [])
                            return q.length
                          } catch { return 0 }
                        })()} <span className="text-[14px] text-slate-300 not-italic ml-1 opacity-50 uppercase tracking-tighter">題</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-600/0 via-purple-600/50 to-cyan-600/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </main>

    </div>
  )
}
