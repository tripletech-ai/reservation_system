'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/app/actions/superAuth'
import { ROUTES } from '@/constants/routes'
import { MANAGER_LEVEL } from '@/constants/common'

export default function SuperAdminLoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const res = await loginAction(formData, MANAGER_LEVEL.SUPER)

    if (res.success) {
      router.push(ROUTES.SUPER_ADMIN.HOME)
    } else {
      setError(res.message || '登入失敗')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-white/[0.02] rounded-full blur-[150px] pointer-events-none" />

      {/* 修改處：移除 opacity-0 和 animate 類名 */}
      <div className="w-full max-w-[460px] relative z-10">
        <div className="text-center mb-12">
          {/* 修改處：移除 transition 和 hover:scale */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-[2rem] shadow-2xl shadow-purple-500/30 mb-8">
            <svg viewBox="0 0 24 24" width="40" height="40" stroke="white" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-4 italic uppercase">
            Triple SuperAdmin
          </h1>
          <p className="text-slate-300 font-medium text-xm tracking-widest uppercase opacity-70">
            系統最高權限管理員登入
          </p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl shadow-black shadow-inner">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 帳號密碼欄位保持不變，但移除內部的 transition-colors 以求徹底靜態 */}
            <div className="space-y-2">
              <label className="text-[14px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">帳號</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-400">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <input
                  name="account"
                  type="text"
                  required
                  placeholder="Super Admin Account"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xm text-white focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.05]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">密碼</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xm text-white focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.05]"
                />
              </div>
            </div>

            {error && (
              /* 修改處：移除 animate-[shake...] */
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                <p className="text-rose-400 text-ms font-bold text-center italic">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              /* 修改處：移除 hover:scale, active:scale, transition-all */
              className="w-full bg-gradient-to-br from-purple-600 to-cyan-600 py-4 rounded-2xl text-white font-black text-[13px] uppercase tracking-widest shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
            >
              {loading ? (
                /* 修改處：移除 animate-spin */
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
              ) : (
                <>確認登入 <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-12 text-[14px] text-slate-600 font-bold tracking-[0.2em] uppercase">
          v1.0.0 © Power By Antigravity-Engine
        </p>

        {/* 2. 移除整段 <style jsx global> 區塊 */}
      </div>
    </div>
  )
}
