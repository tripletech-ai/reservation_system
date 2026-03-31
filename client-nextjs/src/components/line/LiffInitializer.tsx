'use client'

import { useEffect, useState } from 'react'
import { initLiff, getLiffProfile } from '@/lib/liff'
import { Loader2 } from 'lucide-react'
import { CONFIG_ENV } from '@/lib/env'
import { cookies } from 'next/headers'

/**
 * LIFF 身份初始化組件
 * 當 URL 中缺少 line_uid 時，透過此組件取得 LINE 身分後並重新導向原頁面
 */
export default function LiffInitializer() {

  useEffect(() => {
    const initAndRedirect = async () => {
      const liffId = CONFIG_ENV.liffId || ''
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

            console.log("導向至：", url.toString())
            window.location.replace(url.toString())
          }
        }
      } catch (err) {
        console.error("取得 LINE Profile 失敗:", err)
      }
    }

    initAndRedirect()
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
