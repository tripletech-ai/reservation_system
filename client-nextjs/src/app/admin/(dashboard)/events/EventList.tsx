'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { EventListProps, Event } from '@/types'
import { deleteEvent } from '@/app/actions/events'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/components/ui/DialogProvider'
import { ROUTES } from '@/constants/routes'

export default function EventList({ events, menus, managerWebsiteName }: EventListProps) {
  const router = useRouter()
  const { showAlert, showConfirm } = useAlert()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (uid: string) => {
    const isConfirmed = await showConfirm({
      message: '確定要刪除此預約活動嗎？此操作不可復原。',
      type: 'warning',
      confirmText: '確定刪除',
      cancelText: '取消'
    })
    if (!isConfirmed) return
    setIsDeleting(uid)
    const res = await deleteEvent(uid)
    if (res.success) {
      router.refresh()
    } else {
      showAlert({ message: '刪除失敗: ' + res.message, type: 'error' })
    }
    setIsDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl">
        <div className="relative flex-1 max-w-2xl group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input
            type="text"
            placeholder="搜尋活動標題或說明..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-slate-300 font-bold focus:border-cyan-500/50 outline-none transition-all"
          />
        </div>
        <Link
          href={ROUTES.ADMIN.EVENT_NEW}
          className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-black hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-white flex items-center justify-center gap-2 shadow-xl"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>新增預約項目</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const hasPublished = !!event.booking_dynamic_url
            let selectedMenus: { uid: string }[] = []
            try { selectedMenus = JSON.parse(event.schedule_menu_uid || '[]') } catch (e) { }

            return (
              <div key={event.uid} className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 backdrop-blur-xl overflow-hidden flex flex-col">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-5">
                    <span className={`px-3 py-1 rounded-full text-[14px] font-black tracking-wide border shadow-sm ${hasPublished ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-slate-500/20 border-slate-500/30 text-slate-400'}`}>
                      {hasPublished ? '已發佈' : '草稿'}
                    </span>
                    <button
                      onClick={() => handleDelete(event.uid)}
                      disabled={isDeleting === event.uid}
                      className="p-2.5 bg-white/5 border border-white/10 hover:bg-rose-500/20 rounded-xl text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
                    >
                      {isDeleting === event.uid ? <div className="w-4 h-4 border-2 border-t-transparent border-rose-400 rounded-full animate-spin" /> : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>}
                    </button>
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 group-hover:text-cyan-400 transition-colors">{event.title}</h3>
                  <p className="text-slate-400 text-xm font-bold line-clamp-2 mb-8">{event.description || '暫無活動說明...'}</p>

                  {hasPublished && (
                    <div className="space-y-3 mb-6">
                      <div className="flex flex-wrap gap-2">
                        {selectedMenus.map(sm => {
                          const menuName = menus.find(m => m.uid === sm.uid)?.name || '時程'
                          const url = `${origin}/booking/${managerWebsiteName}/${event.booking_dynamic_url}?schedule_menu_uid=${sm.uid}`
                          const url_no_limit = `${origin}/booking/${managerWebsiteName}/${event.booking_dynamic_url}?schedule_menu_uid=${sm.uid}&limit=false`
                          return (
                            <div key={sm.uid} className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  window.open(url, '_blank')
                                }}
                                className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-ms font-bold text-slate-300 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-400 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                {menuName}
                              </button>
                              <button
                                onClick={(e) => handleCopy(url)}
                                className={`p-1.5 border rounded-lg transition-all cursor-pointer ${copied === url ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-purple-400'}`}
                              >
                                {copied === url ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>}
                              </button>
                              <p>
                                (無限制)
                              </p>
                              <button
                                onClick={(e) => handleCopy(url_no_limit)}
                                className={`p-1.5 border rounded-lg transition-all cursor-pointer ${copied === url_no_limit ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-purple-400'}`}
                              >
                                {copied === url_no_limit ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-6 border-t border-white/5">
                    <Link
                      href={ROUTES.ADMIN.EVENT_EDIT(event.uid)}
                      className="w-full py-4 bg-white/10 border border-white/10 rounded-2xl text-ms font-black text-slate-200 hover:bg-white/15 hover:text-white flex items-center justify-center gap-2 transition-all uppercase tracking-widest shadow-inner group-hover:border-purple-500/30"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      <span>編輯預約項設定</span>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-full py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-400 font-bold">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-20"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path></svg>
            <p>{searchTerm ? '找不到符合條件的活動' : '尚無預約項目，請點擊新增。'}</p>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
