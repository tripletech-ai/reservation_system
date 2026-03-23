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

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

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
        alert(res.message || '註冊失敗，請重試！')
      }
    } catch (error) {
      console.error(error)
      alert('系統發生錯誤，請稍後再試。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center relative overflow-hidden font-sans pb-12">
      {/* Background Decor */}
      <div className="absolute -top-32 -right-32 w-[60vw] h-[60vw] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[50vw] h-[50vw] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[500px] px-6 relative z-10 pt-16">
        <header className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-block p-4 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-3xl shadow-xl shadow-purple-500/20 mb-6">
            <User className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">成為會員，開始預約</h1>
          <p className="text-slate-500 text-sm mt-3 font-medium">只需填寫基本資料與偏好，即可享受專屬服務！</p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50"
        >
          {/* Basic Information */}
          <div className="space-y-6">
            <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <User size={14} className="text-purple-600" /> 基本資料
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1 italic">姓名*</label>
                <div className="relative group">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="您的稱呼"
                    className={`w-full bg-slate-50 border-2 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all ${isAttempted && !formData.name ? 'border-rose-200 bg-rose-50' : 'border-transparent focus:border-purple-600/20 focus:bg-white'}`}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1 italic">電話*</label>
                <div className="relative group">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="09XX-XXX-XXX"
                    className={`w-full bg-slate-50 border-2 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all ${isAttempted && !isPhoneValid ? 'border-rose-200 bg-rose-50' : 'border-transparent focus:border-purple-600/20 focus:bg-white'}`}
                  />
                </div>
                {isAttempted && !isPhoneValid && <p className="text-[12px] text-rose-500 font-bold ml-1">請輸入正確的手機格式</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1 italic">電子信箱*</label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="example@mail.com"
                    className={`w-full bg-slate-50 border-2 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all ${isAttempted && !isEmailValid ? 'border-rose-200 bg-rose-50' : 'border-transparent focus:border-purple-600/20 focus:bg-white'}`}
                  />
                </div>
                {isAttempted && !isEmailValid && <p className="text-[12px] text-rose-500 font-bold ml-1">請輸入正確的信箱格式</p>}
              </div>
            </div>
          </div>

          {/* Questionnaire Section */}
          {parsedQuestionnaire.length > 0 && (
            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-8">
              <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <ListTodo size={14} className="text-purple-600" /> 偏好問卷
              </h2>

              {parsedQuestionnaire.map((q: any, idx: number) => {
                const hasOptions = q.options && q.options.length > 0
                return (
                  <div key={idx} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                    <label className="text-sm font-bold text-slate-700 ml-1 block">{q.title}*</label>

                    {hasOptions ? (
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt: any, optIdx: number) => {
                          const isSelected = answers[q.title] === opt.title
                          return (
                            <button
                              key={optIdx}
                              onClick={() => setAnswers(prev => ({ ...prev, [q.title]: opt.title }))}
                              className={`
                                px-4 py-2 rounded-xl text-sm font-bold transition-all border-2
                                ${isSelected ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-white border-slate-100 text-slate-500 hover:border-purple-200'}
                              `}
                            >
                              {opt.title}
                            </button>
                          )
                        })}
                        <button
                          onClick={() => setAnswers(prev => ({ ...prev, [q.title]: '__OTHER__' }))}
                          className={`
                            px-4 py-2 rounded-xl text-sm font-bold transition-all border-2
                            ${answers[q.title] === '__OTHER__' ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-white border-slate-100 text-slate-500 hover:border-purple-200'}
                          `}
                        >
                          其他
                        </button>
                      </div>
                    ) : null}

                    {/* Input for other or direct text questions */}
                    {(answers[q.title] === '__OTHER__' || !hasOptions) && (
                      <div className="relative animate-in zoom-in-95 duration-200">
                        <input
                          type="text"
                          placeholder="請輸入詳情..."
                          value={otherInputs[q.title] || ''}
                          onChange={(e) => setOtherInputs(prev => ({ ...prev, [q.title]: e.target.value }))}
                          className={`w-full bg-slate-50 border-2 rounded-2xl px-5 py-3 text-sm outline-none transition-all ${isAttempted && answers[q.title] === '__OTHER__' && !otherInputs[q.title]?.trim() ? 'border-rose-200 bg-rose-50' : 'border-transparent focus:border-purple-600/20 focus:bg-white'}`}
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
              w-full mt-10 py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all duration-300
              ${isSubmitting ? 'bg-slate-200 cursor-not-allowed' : 'bg-gradient-to-br from-purple-600 to-cyan-600 shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95'}
            `}
          >
            {isSubmitting ? (
              <><Loader2 className="animate-spin" size={20} /> 處理中...</>
            ) : (
              <>送出資料 <ArrowRight size={20} /></>
            )}
          </button>
        </motion.div>

        {/* Footer */}
        <footer className="mt-12 text-center opacity-40">
          <p className="text-[12px] font-bold text-slate-500 tracking-widest uppercase">
            v0.1.1 © Triple Reservation System
          </p>
        </footer>
      </div>
    </div>
  )
}
