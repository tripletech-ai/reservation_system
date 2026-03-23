'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Clock, Edit2, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import type { ScheduleMenu } from '@/types'
import { createScheduleMenu, deleteScheduleMenu } from '@/app/actions/schedules'

interface ScheduleListProps {
  menus: ScheduleMenu[]
  managerUid: string
}

export default function ScheduleList({ menus, managerUid }: ScheduleListProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (uid: string) => {
    if (!confirm('確定要刪除此排程模板嗎？此操作不可復原。')) return
    setIsDeleting(uid)
    const res = await deleteScheduleMenu(uid)
    if (res.success) {
      router.refresh()
    } else {
      alert('刪除失敗: ' + (res.message || '未知錯誤'))
    }
    setIsDeleting(null)
  }

  const handleCreate = async () => {
    setIsCreating(true)
    const res = await createScheduleMenu(managerUid)
    if (res.success && res.uid) {
      router.push(`/schedules/${res.uid}`)
    } else {
      alert('建立失敗: ' + (res.message || '未知錯誤'))
    }
    setIsCreating(false)
  }

  return (
    <div className="space-y-6">
      {/* 操作欄 */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-bold text-white">排程時段管理</h2>
          <p className="text-slate-400 text-sm mt-1">設定不同時段的預約規則與公休日</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 transition-all text-white flex items-center gap-2 disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          新增時程
        </button>
      </div>

      {/* 資料網格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menus.length > 0 ? (
          menus.map((menu) => (
            <div
              key={menu.uid}
              className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 backdrop-blur-xl overflow-hidden"
            >
              {/* 背景裝飾 */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 group-hover:scale-110 transition-transform">
                    <Calendar className="text-purple-400" size={24} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(menu.uid)
                      }}
                      disabled={isDeleting === menu.uid}
                      className="p-2 bg-white/5 hover:bg-rose-500/20 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      {isDeleting === menu.uid ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  {menu.name || '未命名模板'}
                </h3>

                <div className="space-y-3 mt-auto pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={14} className="text-cyan-400" />
                    <span>更新於 {new Date(menu.update_at).toLocaleDateString('zh-TW')}</span>
                  </div>

                  <Link
                    href={`/schedules/${menu.uid}`}
                    className="w-full py-3 mt-2 bg-white/5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white flex items-center justify-center gap-2 group/btn transition-all"
                  >
                    設定時段時程
                    <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-500">
            <Calendar className="w-12 h-12 mb-4 opacity-20" />
            <p>尚無任何時程模板，請點擊右上方新增。</p>
          </div>
        )}
      </div>
    </div>
  )
}
