'use client'

import { useEffect } from 'react'
import { ROUTES } from '@/constants/routes'
import Link from 'next/link'

export default function LandingClient() {
  useEffect(() => {
    const line_back_url = localStorage.getItem('line_back_url')
    if (line_back_url) {
      window.location.replace(line_back_url)
      localStorage.removeItem('line_back_url')
    }
  }, [])

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      ),
      colorClass: "text-purple-400",
      title: "Google 日曆同步",
      desc: "所有預約自動寫入行事曆，確保您的行程不發生衝突。"
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-7.6 8.38 8.38 0 0 1 3.8.9L21 3.5z"></path></svg>
      ),
      colorClass: "text-cyan-400",
      title: "LINE 自動通知",
      desc: "預約成功、取消即時通知顧客與管理者，訊息零時差。"
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
      ),
      colorClass: "text-emerald-400",
      title: "安全身份驗證",
      desc: "結合 LIFF 驗證與會員系統，為您的生意把關每一位顧客。"
    }
  ]

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-600/10 rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          </div>
          <span className="text-xl font-black tracking-tighter uppercase whitespace-nowrap">
            Triple <span className="text-cyan-400">Reserve</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <Link href="#features" className="hover:text-white transition-colors">功能特性</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">運作流程</Link>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="pt-20 pb-32 px-6 text-center">
          <div className="max-w-4xl mx-auto opacity-0 animate-[fadeUp_0.8s_ease-out_forwards]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-purple-400 mb-10 tracking-[0.3em] uppercase">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg> 2026 Future Era of Reservation
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
                立即開始體驗 <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className="group relative p-12 rounded-[3.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl hover:border-white/20 transition-all duration-500 overflow-hidden"
              >
                <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-gradient-to-br group-hover:from-purple-600 group-hover:to-cyan-600 group-hover:scale-110 transition-all duration-500 shadow-inner">
                  <span className={`${f.colorClass} group-hover:text-white transition-colors`}>{f.icon}</span>
                </div>
                <h3 className="text-2xl font-black mb-5 tracking-tight">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed font-bold group-hover:text-slate-300 transition-colors">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="py-32 px-6">
          <div className="max-w-6xl mx-auto bg-gradient-to-br from-slate-900 via-black to-slate-900 rounded-[5rem] p-12 md:p-24 border border-white/10 relative overflow-hidden shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-black mb-20 text-center tracking-tighter">零門檻的自動化管理</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative z-10">
              {[
                { step: "01", title: "快速建置", desc: "自定義服務、時間表，並一鍵生成專屬連結", icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg> },
                { step: "02", title: "分享預約", desc: "顧客無需下載額外 App，透過 LINE 手機即刻下單", icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> },
                { step: "03", title: "雙向同步", desc: "接單即通知，所有數據即時寫入雲端與行事曆", icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> }
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
          </div>
        </section>

        <section className="py-48 px-6 text-center relative">
          <div>
            <h2 className="text-5xl md:text-7xl font-black mb-12 leading-[1.1] tracking-tight">
              把最好的體驗 <br />留給您的顧客。
            </h2>
            <div className="mt-24 flex flex-wrap items-center justify-center gap-12 text-slate-600 font-bold uppercase tracking-[0.3em] text-[10px]">
              <div className="flex items-center gap-3"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> 極速對接</div>
              <div className="flex items-center gap-3"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> 系統穩定</div>
              <div className="flex items-center gap-3"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg> 美感至上</div>
            </div>
          </div>
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
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
