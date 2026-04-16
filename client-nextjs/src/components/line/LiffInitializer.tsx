'use client'

import { useEffect } from 'react'
import { initLiff, getLiffProfile } from '@/lib/liff'

/**
 * LIFF 身份初始化組件
 * 當 URL 中缺少 line_uid 時，透過此組件取得 LINE 身分後並重新導向原頁面
 */
export default function LiffInitializer({ liffId }: { liffId: string }) {
  console.log('liffId', liffId)
  useEffect(() => {
    const initAndRedirect = async () => {
      if (!liffId) return

      localStorage.setItem('line_back_url', window.location.href)

      try {
        await initLiff(liffId)
        const profile = await getLiffProfile()

        if (profile?.userId) {
          const url = new URL(window.location.href)

          // 3. 關鍵：檢查參數是否已存在，避免無限循環
          if (url.searchParams.get('line_uid') !== profile.userId) {
            url.searchParams.set('line_uid', profile.userId)
            window.location.replace(url.toString())
            localStorage.removeItem('line_back_url')
          }
        }
      } catch (err) {
        console.error("取得 LINE Profile 失敗:", err)
      }
    }

    initAndRedirect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] text-slate-900">
      {/* 背景裝飾：將原本深紫色的發光改為更柔和的淺紫色/藍色暈染 */}
      <div className="relative">
        <div className="absolute inset-0 bg-purple-200/50 blur-[40px] rounded-full" />
        {/* 調整 Loader 顏色，使其在淺色背景下更顯眼 */}
        <div className="relative z-10 mb-6">
          <svg className="animate-spin text-cyan-600 h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        </div>
      </div>

      {/* 標題：調整漸層色深一點，確保閱讀清晰度 */}
      <h2 className="text-xl font-black tracking-[0.2em] mb-2 uppercase bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
        Secure Access
      </h2>

      {/* 副標題：將原本的 slate-500 改為稍深的 slate-400/500，在淺色背景更協調 */}
      <p className="font-bold tracking-widest text-slate-400 text-xs sm:text-sm">
        正在完成 LINE 身份安全驗證...
      </p>
    </div>
  )
}
