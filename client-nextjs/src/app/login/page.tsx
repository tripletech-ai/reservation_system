'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, User, Lock, ArrowRight, Loader } from 'lucide-react'
import { loginAction } from '../actions/auth'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await loginAction(formData)

    setLoading(false)
    if (result.success) {
      setSuccess(true)
      window.location.href = '/members'
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
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-10 space-y-8">
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="inline-flex p-3 bg-purple-500/20 rounded-2xl mb-4"
              >
                <LogIn className="w-8 h-8 text-purple-400" />
              </motion.div>
              <h1 className="text-4xl font-bold text-white tracking-tight">後台管理登入</h1>
              <p className="text-slate-400">登入以存取預約管理系統</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <input
                    name="account"
                    type="text"
                    required
                    placeholder="帳號"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="密碼"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                  />
                </div>
              </div>

              <AnimatePresence mode='wait'>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg text-center"
                  >
                    {error}
                  </motion.p>
                )}
                {success && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-emerald-400 text-sm bg-emerald-400/10 p-3 rounded-lg text-center"
                  >
                    登入成功！正為您跳轉...
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || success}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/30 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>立即登入</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>
          </div>

          <div className="p-6 bg-white/5 border-t border-white/10 text-center">
            <p className="text-sm text-slate-500">
              © 2024 Reservation System. All rights reserved.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
