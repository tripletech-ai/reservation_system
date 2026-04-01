'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/constants/routes'
import { loginAction } from '@/app/actions/superAuth'
import { MANAGER_LEVEL } from '@/constants/common'

export default function LoginClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await loginAction(formData, MANAGER_LEVEL.ADMIN)
    setLoading(false)
    if (result.success) {
      setSuccess(true)
      router.push(ROUTES.ADMIN.HOME)
      router.refresh()
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0a] overflow-hidden font-bold">
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-40">
        <img src="/login-bg.png" alt="Login Background" className="w-full h-full object-cover" />
      </div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px]" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-600/30 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10 p-1">
        <div className="backdrop-blur-[40px] bg-white/[0.03] border border-white/20 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
          <div className="p-8 md:p-12 space-y-10 relative z-10">
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-3xl mb-4 border border-white/10 shadow-inner">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                管理系統 <br />
                <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">立即登入</span>
              </h1>
              <p className="text-slate-400 font-black text-xm tracking-widest opacity-60">ADMINISTRATION PORTAL</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-purple-400 transition-colors">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <input
                    name="account"
                    type="text"
                    required
                    placeholder="管理帳號"
                    className="w-full pl-14 pr-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 font-bold outline-none focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-purple-400 transition-colors">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="管理密碼"
                    className="w-full pl-14 pr-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 font-bold outline-none focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-xm bg-red-400/10 p-4 rounded-xl text-center font-bold">{error}</p>}
              {success && <p className="text-emerald-400 text-xm bg-emerald-400/10 p-4 rounded-xl text-center font-bold">登入成功！跳轉中...</p>}

              <button
                disabled={loading || success}
                className="w-full py-4.5 px-8 bg-gradient-to-r from-purple-600 to-cyan-600 hover:shadow-lg hover:shadow-purple-500/30 text-white font-black text-lg rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><span>立即管理平台</span><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></>}
              </button>
            </form>
          </div>
          <div className="p-8 bg-white/5 border-t border-white/10 text-center">
            <p className="text-ms text-slate-500 font-black uppercase tracking-widest">© 2024 RESERVATION PRO.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
