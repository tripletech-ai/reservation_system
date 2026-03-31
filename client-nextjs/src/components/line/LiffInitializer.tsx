'use client'

import { useEffect } from 'react'
import { initLiff, getLiffProfile } from '@/lib/liff'
import { Loader2 } from 'lucide-react'
import { CONFIG_ENV } from '@/lib/env'

/**
 * LIFF 身份初始化組件
 * 當 URL 中缺少 line_uid 時，透過此組件取得 LINE 身分後並重新導向原頁面
 */
export default function LiffInitializer() {
  useEffect(() => {
    const liffId = CONFIG_ENV.liffId || ''
    if (!liffId) {
      console.error("尚未設定 NEXT_PUBLIC_LIFF_ID 環境變數");
      return;
    }
    console.log("liffId", liffId)
    initLiff(liffId).then(async () => {
      try {
        const profile = await getLiffProfile()
        if (profile) {
          // 將取得的 UID 加入 URL 參數並重新載入頁面 (讓 Server Component 可以讀到)
          const url = new URL(window.location.href)
          url.searchParams.set('line_uid', profile.userId)
          console.log("url", url.toString())
          console.log("profile.userId", profile.userId)
          setTimeout(() => {
            window.location.replace(url.toString())
          }, 10000);
        }
      } catch (err) {
        console.error("取得 LINE Profile 失敗:", err)
      }
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white">
      <div className="relative">
        <div className="absolute inset-0 bg-purple-500/20 blur-[50px] rounded-full" />
        <Loader2 className="animate-spin mb-6 text-cyan-400 relative z-10" size={48} />
      </div>
      <h2 className="text-xl font-black tracking-[0.2em] mb-2 uppercase bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
        Secure Access
      </h2>
      <p className="font-bold tracking-widest text-slate-500 text-sm">正在完成 LINE 身份安全驗證...</p>
    </div>
  )
}
