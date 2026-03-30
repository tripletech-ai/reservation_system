'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, User, Lock, ArrowRight, Loader } from 'lucide-react'

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
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-40">
        <img
          src="/login-bg.png"
          alt="Login Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 動態漸層 */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px]" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-600/30 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10 p-1"
      >
        <div className="backdrop-blur-[40px] bg-white/[0.03] border border-white/20 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] relative">
          <div className="p-8 md:p-12 space-y-10 relative z-10">
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="inline-flex p-4 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 rounded-3xl mb-4 border border-white/10 shadow-inner"
              >
                <LogIn className="w-10 h-10 text-white" />
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                後台管理系統 <br />
                <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">立即登入</span>
              </h1>
              <p className="text-slate-400 font-bold text-xm tracking-widest opacity-60">ADMINISTRATION PORTAL</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-purple-400 transition-colors pointer-events-none" />
                  <input
                    name="account"
                    type="text"
                    required
                    placeholder="管理帳號"
                    className="w-full pl-14 pr-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 font-bold outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300 shadow-inner"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-purple-400 transition-colors pointer-events-none" />
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="管理密碼"
                    className="w-full pl-14 pr-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 font-bold outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300 shadow-inner"
                  />
                </div>
              </div>

              <AnimatePresence mode='wait'>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-xm bg-red-400/10 p-3 rounded-lg text-center"
                  >
                    {error}
                  </motion.p>
                )}
                {success && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-emerald-400 text-xm bg-emerald-400/10 p-3 rounded-lg text-center"
                  >
                    登入成功！正為您跳轉...
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || success}
                className="w-full py-4.5 px-8 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-lg rounded-2xl shadow-[0_10px_30px_-10px_rgba(147,51,234,0.5)] hover:shadow-[0_15px_40px_-10px_rgba(147,51,234,0.7)] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <Loader className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>立即登入後台</span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </motion.button>
            </form>
          </div>

          <div className="p-8 bg-white/5 border-t border-white/10 text-center relative overflow-hidden">
            <p className="text-ms text-slate-300 font-bold uppercase tracking-[0.2em] relative z-10">
              © 2024 RESERVATION PRO. ALL RIGHTS RESERVED.
            </p>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
