'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, User, Loader2, ArrowRight, Shield } from 'lucide-react'
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


      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[460px] relative z-10"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-[2rem] shadow-2xl shadow-purple-500/30 mb-8"
          >
            <Shield className="text-white w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-4 italic uppercase">
            Triple SuperAdmin
          </h1>
          <p className="text-slate-300 font-medium text-xm tracking-widest uppercase opacity-70">
            系統最高權限管理員登入
          </p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl shadow-black shadow-inner">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[14px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">帳號</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-400 transition-colors">
                  <User size={18} />
                </div>
                <input
                  name="account"
                  type="text"
                  required
                  placeholder="Super Admin Account"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xm text-white focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">密碼</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xm text-white focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl"
              >
                <p className="text-rose-400 text-ms font-bold text-center italic">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-purple-600 to-cyan-600 py-4 rounded-2xl text-white font-black text-[13px] uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-x-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>確認登入 <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-12 text-[14px] text-slate-600 font-bold tracking-[0.2em] uppercase">
          v1.0.0 © Power By Antigravity-Engine
        </p>
      </motion.div>
    </div>
  )
}
