'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Clock, Edit2, Trash2, ExternalLink, Search, Box } from 'lucide-react'
import type { EventListProps } from '@/types'
import { deleteEvent } from '@/app/actions/events'
import { useRouter } from 'next/navigation'


export default function EventList({ events, menus, managerUid, managerWebsiteName }: EventListProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (uid: string) => {
    if (!confirm('確定要刪除此預約活動嗎？此操作不可復原。')) return
    setIsDeleting(uid)
    const res = await deleteEvent(uid)
    if (res.success) {
      router.refresh()
    } else {
      alert('刪除失敗: ' + res.message)
    }
    setIsDeleting(null)
  }

  return (
    <div className="space-y-6">
      {/* 操作欄 */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="搜尋活動標題或說明..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:border-purple-500/50 outline-none transition-all"
          />
        </div>
        <Link
          href="/events/new"
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 transition-all text-white flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          新增預約項目
        </Link>
      </div>

      {/* 資料網格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const hasPublished = !!event.booking_dynamic_url
            let selectedMenus: { uid: string }[] = []
            try { selectedMenus = JSON.parse(event.schedule_menu_uid || '[]') } catch (e) { }

            return (
              <div
                key={event.uid}
                className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 backdrop-blur-xl overflow-hidden flex flex-col"
              >
                {/* 背景裝飾 */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${hasPublished ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'}`}>
                      {hasPublished ? '已發佈' : '草稿'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(event.uid)}
                        disabled={isDeleting === event.uid}
                        className="p-2 bg-white/5 hover:bg-rose-500/20 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        {isDeleting === event.uid ? <span className="w-4 h-4 block border-2 border-t-transparent border-rose-400 rounded-full animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                    {event.title}
                  </h3>

                  <p className="text-slate-400 text-sm line-clamp-2 mb-6">
                    {event.description || '暫無活動說明...'}
                  </p>
                  {hasPublished && (
                    <div className="space-y-2 mb-6">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">測試連接</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMenus.length > 0 ? (
                          selectedMenus.map(sm => {
                            const menuName = menus.find(m => m.uid === sm.uid)?.name || '未知時程'
                            return (
                              <button
                                key={sm.uid}
                                onClick={() => {
                                  if (!event.booking_dynamic_url) return
                                  const url = `${window.location.origin}/booking/${managerWebsiteName}/${event.booking_dynamic_url}?schedule_menu_uid=${sm.uid}`
                                  window.open(url, '_blank')
                                }}
                                disabled={!event.booking_dynamic_url}
                                className={`px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] flex items-center gap-1.5 transition-all ${event.booking_dynamic_url ? 'text-slate-300 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-400 cursor-pointer' : 'text-slate-600 cursor-not-allowed opacity-50'
                                  }`}
                              >
                                <ExternalLink size={10} className={event.booking_dynamic_url ? "text-purple-400" : "text-slate-600"} />
                                {menuName}
                              </button>
                            )
                          })
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">尚未連結時程</span>
                        )}
                      </div>
                    </div>
                  )}


                  <div className="mt-auto pt-6 border-t border-white/5 flex gap-3">
                    <Link
                      href={`/events/${event.uid}`}
                      className="flex-1 py-3 bg-white/5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white flex items-center justify-center gap-2 transition-all border border-white/5"
                    >
                      <Edit2 size={14} />
                      編輯設定
                    </Link>

                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-full py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-500">
            <Box className="w-12 h-12 mb-4 opacity-20" />
            <p>{searchTerm ? '找不到符合搜尋條件的活動' : '尚無預約項目，請點擊右前方新增。'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
