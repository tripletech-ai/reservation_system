'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  Phone,
  Mail,
  Loader2,
  ListTodo,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { registerMember } from '@/app/actions/members'
import { useAlert } from '@/components/ui/DialogProvider'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showAlert } = useAlert()

  // -- Params from URL --
  const line_uid = searchParams.get('line_uid') || ''
  const manager_uid = searchParams.get('manager_uid') || ''
  const questionnaireStr = searchParams.get('questionnaire') || ''
  const return_url = searchParams.get('return_url') || '/login'

  // -- Form State --
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  })

  // Questionnaire Logic
  const parsedQuestionnaire = useMemo(() => {
    if (!questionnaireStr) return []
    try {
      const parsed = JSON.parse(questionnaireStr)
      // Sometimes it might be double-stringified depending on how it's handled in URL
      return typeof parsed === 'string' ? JSON.parse(parsed) : parsed
    } catch {
      return []
    }
  }, [questionnaireStr])

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [otherInputs, setOtherInputs] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAttempted, setIsAttempted] = useState(false)

  // -- Validation --
  const isPhoneValid = useMemo(() => {
    if (!formData.phone) return false
    const cleanPhone = formData.phone.replace(/[- ]/g, '')
    return /^09\d{8}$/.test(cleanPhone)
  }, [formData.phone])

  const isEmailValid = useMemo(() => {
    if (!formData.email) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
  }, [formData.email])

  const isQuestionnaireComplete = useMemo(() => {
    if (!parsedQuestionnaire || parsedQuestionnaire.length === 0) return true
    for (const q of parsedQuestionnaire) {
      const hasOptions = q.options && q.options.length > 0
      if (hasOptions) {
        if (!answers[q.title]) return false
        if (answers[q.title] === '__OTHER__' && !otherInputs[q.title]?.trim()) return false
      } else {
        // 純文字題
        if (!otherInputs[q.title]?.trim()) return false
      }
    }
    return true
  }, [answers, otherInputs, parsedQuestionnaire])

  const handleRegister = async () => {
    setIsAttempted(true)
    if (!formData.name || !isPhoneValid || !isEmailValid || !isQuestionnaireComplete) {
      return
    }

    setIsSubmitting(true)
    try {
      // Assemble answers formatted as [{title, ans}]
      const finalAnswers = parsedQuestionnaire.map((q: any) => {
        const hasOptions = q.options && q.options.length > 0
        let ans = ''
        if (hasOptions) {
          const raw = answers[q.title]
          ans = raw === '__OTHER__' ? (otherInputs[q.title]?.trim() || '') : (raw || '')
        } else {
          ans = otherInputs[q.title]?.trim() || ''
        }
        return { title: q.title, ans }
      })

      const payload = {
        manager_uid,
        name: formData.name,
        line_uid: line_uid.replace(/["']/g, ''),
        phone: formData.phone.replace(/[- ]/g, ''),
        email: formData.email,
        questionnaire: JSON.stringify(finalAnswers)
      }

      const res = await registerMember(payload)
      console.log(res)
      if (res.success) {
        // Redirect back with replacement to avoid back-button loop to register page
        router.replace(return_url)
      } else {
        showAlert({ message: res.message || '註冊失敗，請重試！', type: 'error' })
      }
    } catch (error) {
      console.error(error)
      showAlert({ message: '系統發生錯誤，請稍後再試。', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center relative overflow-hidden font-sans pb-12">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-40">
        <div className="absolute -top-32 -right-32 w-[80vw] h-[80vw] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[60vw] h-[60vw] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      </div>

      <div className="w-full max-w-[540px] px-6 relative z-10 pt-16">
        <header className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-block p-5 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-[2rem] shadow-2xl shadow-purple-500/30 mb-6 border border-white/20">
            <User className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-tight uppercase">
            成為特約會員 <br />
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">開始您的預約</span>
          </h1>
          <p className="text-slate-300 text-xm mt-4 font-bold tracking-wide">只需填寫基本資料，即可享受專屬極致服務</p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]"
        >
          <div className="space-y-6">
            <h2 className="text-[12px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 opacity-60">
              <User size={14} className="text-cyan-400" /> 基本資料 BASIC INFO
            </h2>

            <div className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-[13px] font-black text-slate-400 ml-1 uppercase tracking-wider">姓名 NAME</label>
                <div className="relative group">
                  <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="您的稱呼"
                    className={`w-full bg-white/5 border-2 rounded-2xl pl-14 pr-6 py-4 text-white placeholder-slate-600 font-bold outline-none transition-all shadow-inner ${isAttempted && !formData.name ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/5 focus:border-purple-500/40 focus:bg-white/10'}`}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[13px] font-black text-slate-400 ml-1 uppercase tracking-wider">電話 PHONE</label>
                <div className="relative group">
                  <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="09XX-XXX-XXX"
                    className={`w-full bg-white/5 border-2 rounded-2xl pl-14 pr-6 py-4 text-white placeholder-slate-600 font-bold outline-none transition-all shadow-inner ${isAttempted && !isPhoneValid ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/5 focus:border-purple-500/40 focus:bg-white/10'}`}
                  />
                </div>
                {isAttempted && !isPhoneValid && <p className="text-[13px] text-rose-400 font-black ml-1 tracking-tighter">請輸入正確的手機格式</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[13px] font-black text-slate-400 ml-1 uppercase tracking-wider">電子信箱 EMAIL</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="example@mail.com"
                    className={`w-full bg-white/5 border-2 rounded-2xl pl-14 pr-6 py-4 text-white placeholder-slate-600 font-bold outline-none transition-all shadow-inner ${isAttempted && !isEmailValid ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/5 focus:border-purple-500/40 focus:bg-white/10'}`}
                  />
                </div>
                {isAttempted && !isEmailValid && <p className="text-[13px] text-rose-400 font-black ml-1 tracking-tighter">請輸入正確的信箱格式</p>}
              </div>
            </div>
          </div>

          {/* Questionnaire Section */}
          {parsedQuestionnaire.length > 0 && (
            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-10">
              <h2 className="text-[12px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 opacity-60">
                <ListTodo size={14} className="text-cyan-400" /> 偏好問卷 PREFERENCES
              </h2>

              {parsedQuestionnaire.map((q: any, idx: number) => {
                const hasOptions = q.options && q.options.length > 0
                return (
                  <div key={idx} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                    <label className="text-xm font-black text-white ml-1 block">{q.title}</label>

                    {hasOptions ? (
                      <div className="flex flex-wrap gap-3">
                        {q.options.map((opt: any, optIdx: number) => {
                          const isSelected = answers[q.title] === opt.title
                          return (
                            <button
                              key={optIdx}
                              onClick={() => setAnswers(prev => ({ ...prev, [q.title]: opt.title }))}
                              className={`
                                px-6 py-3 rounded-2xl text-ms font-black transition-all border-2
                                ${isSelected ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/40' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10'}
                              `}
                            >
                              {opt.title}
                            </button>
                          )
                        })}
                        <button
                          onClick={() => setAnswers(prev => ({ ...prev, [q.title]: '__OTHER__' }))}
                          className={`
                            px-6 py-3 rounded-2xl text-ms font-black transition-all border-2
                            ${answers[q.title] === '__OTHER__' ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/40' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10'}
                          `}
                        >
                          其他
                        </button>
                      </div>
                    ) : null}

                    {/* Input for other or direct text questions */}
                    {(answers[q.title] === '__OTHER__' || !hasOptions) && (
                      <div className="relative animate-in zoom-in-95 duration-300">
                        <input
                          type="text"
                          placeholder="請輸入詳情..."
                          value={otherInputs[q.title] || ''}
                          onChange={(e) => setOtherInputs(prev => ({ ...prev, [q.title]: e.target.value }))}
                          className={`w-full bg-white/5 border-2 rounded-2xl px-6 py-4 text-white font-bold outline-none transition-all shadow-inner ${isAttempted && answers[q.title] === '__OTHER__' && !otherInputs[q.title]?.trim() ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/5 focus:border-purple-500/40 focus:bg-white/10'}`}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleRegister}
            disabled={isSubmitting}
            className={`
              w-full mt-10 py-5 rounded-[1.5rem] text-white font-black text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_15px_40px_-5px_rgba(147,51,234,0.4)]
              ${isSubmitting ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5' : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:scale-[1.03] active:scale-95 border border-white/20'}
            `}
          >
            {isSubmitting ? (
              <><Loader2 className="animate-spin" size={24} /> 處理中...</>
            ) : (
              <>確認送出註冊 <ArrowRight size={22} /></>
            )}
          </button>
        </motion.div>

        {/* Footer */}
        <footer className="mt-12 text-center opacity-40">
          <p className="text-[14px] font-black text-slate-300 tracking-[0.3em] uppercase">
            v0.2.0 © SECURE RESERVATION GATEWAY
          </p>
        </footer>
      </div>
    </div>
  )
}
