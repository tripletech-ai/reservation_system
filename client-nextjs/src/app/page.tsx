'use client'

import { ROUTES } from '@/constants/routes'
import { motion } from 'framer-motion'
import {
  Calendar,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react'
import Link from 'next/link'

/**
 * Triple Reservation System - 官方首頁設計
 */
export default function LandingPage() {
  const features = [
    {
      Icon: Calendar,
      colorClass: "text-purple-400",
      title: "Google 日曆同步",
      desc: "所有預約自動寫入行事曆，確保您的行程不發生衝突。"
    },
    {
      Icon: MessageCircle,
      colorClass: "text-cyan-400",
      title: "LINE 自動通知",
      desc: "預約成功、取消即時通知顧客與管理者，訊息零時差。"
    },
    {
      Icon: ShieldCheck,
      colorClass: "text-emerald-400",
      title: "安全身份驗證",
      desc: "結合 LIFF 驗證與會員系統，為您的生意把關每一位顧客。"
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 overflow-x-hidden">
      {/* 🚀 背景裝飾 - 炫彩球 */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-600/10 rounded-full blur-[120px]" />
      </div>

      {/* 🏠 導航列 */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center">
            <Layers size={21} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase whitespace-nowrap">
            Triple <span className="text-cyan-400">Reserve</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <Link href="#features" className="hover:text-white transition-colors">功能特性</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">運作流程</Link>
          <div className="w-px h-4 bg-white/10 mx-2" />
        </div>
      </nav>

      <main className="relative z-10">
        {/* 🌟 Hero Section */}
        <section className="pt-20 pb-32 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-purple-400 mb-10 tracking-[0.3em] uppercase">
              <Sparkles size={12} className="animate-pulse" /> 2026 Future Era of Reservation
            </div>

            <h1 className="text-5xl md:text-[5rem] lg:text-[7rem] font-black tracking-tight leading-[1] mb-10">
              專為極致服務打造的 <br />
              <span className="bg-gradient-to-r from-purple-400 via-cyan-400 via-emerald-400 to-purple-400 bg-[length:200%_auto] animate-gradient-flow bg-clip-text text-transparent italic">全能預約系統</span>
            </h1>

            <p className="text-slate-400 text-lg md:text-xl font-bold max-w-2xl mx-auto leading-relaxed mb-14 opacity-80">
              從顧客點擊 LINE 到您的 Google 日曆同步完成，我們將中間的所有繁瑣自動化，成就您的頂級事業。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                href={ROUTES.LOGIN}
                className="group w-full sm:w-auto px-12 py-5 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-3xl font-black text-lg shadow-[0_20px_50px_-10px_rgba(147,51,234,0.5)] hover:shadow-[0_25px_60px_-10px_rgba(147,51,234,0.6)] hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                立即開始體驗 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              {/* <button className="w-full sm:w-auto px-12 py-5 bg-white/5 border border-white/10 rounded-3xl font-black text-lg hover:bg-white/10 transition-all border-b-white/20">
                觀看展示紀錄
              </button> */}
            </div>
          </motion.div>
        </section>

        {/* 💎 核心價值 Features */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="group relative p-12 rounded-[3.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl hover:border-white/20 transition-all duration-500 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-gradient-to-br group-hover:from-purple-600 group-hover:to-cyan-600 group-hover:scale-110 transition-all duration-500 shadow-inner">
                  <f.Icon
                    size={28}
                    className={`${f.colorClass} group-hover:text-white transition-colors`}
                  />
                </div>

                <h3 className="text-2xl font-black mb-5 tracking-tight">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed font-bold group-hover:text-slate-300 transition-colors">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* 🛠 運作流程 How It Works */}
        <section id="how-it-works" className="py-32 px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto bg-gradient-to-br from-slate-900 via-black to-slate-900 rounded-[5rem] p-12 md:p-24 border border-white/10 relative overflow-hidden shadow-2xl"
          >
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 blur-[130px]" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 blur-[130px]" />

            <h2 className="text-4xl md:text-5xl font-black mb-20 text-center tracking-tighter">零門檻的自動化管理</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative z-10">
              {[
                { step: "01", title: "快速建置", desc: "自定義服務、時間表，並一鍵生成專屬連結", icon: <Layers /> },
                { step: "02", title: "分享預約", desc: "顧客無需下載額外 App，透過 LINE 手機即刻下單", icon: <ArrowRight /> },
                { step: "03", title: "雙向同步", desc: "接單即通知，所有數據即時寫入雲端與行事曆", icon: <CheckCircle2 /> }
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className="text-[5rem] font-black text-white/[0.03] mb-[-2.5rem] tracking-tighter group-hover:text-purple-500/10 transition-colors">
                    {s.step}
                  </div>
                  <h4 className="text-[22px] font-black mb-4 relative z-10">{s.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed font-bold relative z-10 max-w-[200px]">{s.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* 🏁 尾聲呼籲 Footer CTA */}
        <section className="py-48 px-6 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-7xl font-black mb-12 leading-[1.1] tracking-tight">
              把最好的體驗 <br />留給您的顧客。
            </h2>

            <div className="mt-24 flex flex-wrap items-center justify-center gap-12 text-slate-600 font-bold uppercase tracking-[0.3em] text-[10px]">
              <div className="flex items-center gap-3"><Clock size={16} className="text-purple-600" /> 極速對接</div>
              <div className="flex items-center gap-3"><CheckCircle2 size={16} className="text-cyan-600" /> 系統穩定</div>
              <div className="flex items-center gap-3"><Sparkles size={16} className="text-emerald-600" /> 美感至上</div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 py-16 border-t border-white/5 text-center px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded-md" />
            <span className="text-[12px] font-black tracking-widest uppercase">Triple Reserve</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase">
            © 2026 SECURE RESERVATION GATEWAY. BUILT FOR EXCELLENCE.
          </p>
          <div className="flex gap-6 text-[10px] font-black">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
