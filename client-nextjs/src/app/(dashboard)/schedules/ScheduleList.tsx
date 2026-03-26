'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Clock, Edit2, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import type { ScheduleMenu } from '@/types'
import { createScheduleMenu, deleteScheduleMenu } from '@/app/actions/schedules'
import { useAlert } from '@/components/ui/DialogProvider'

interface ScheduleListProps {
  menus: ScheduleMenu[]
  managerUid: string
}

export default function ScheduleList({ menus, managerUid }: ScheduleListProps) {
  const router = useRouter()
  const { showAlert, showConfirm } = useAlert()
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (uid: string) => {
    const isConfirmed = await showConfirm({
      message: '確定要刪除此排程模板嗎？此操作不可復原。',
      type: 'warning',
      confirmText: '確定刪除',
      cancelText: '取消'
    })
    if (!isConfirmed) return
    setIsDeleting(uid)
    const res = await deleteScheduleMenu(uid)
    if (res.success) {
      router.refresh()
    } else {
      showAlert({ message: '刪除失敗: ' + (res.message || '未知錯誤'), type: 'error' })
    }
    setIsDeleting(null)
  }

  const handleCreate = async () => {
    setIsCreating(true)
    const res = await createScheduleMenu(managerUid)
    if (res.success && res.uid) {
      router.push(`/schedules/${res.uid}`)
    } else {
      showAlert({ message: '建立失敗: ' + (res.message || '未知錯誤'), type: 'error' })
    }
    setIsCreating(false)
  }

  return (
    <div className="space-y-6">
      {/* 操作欄 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-xl">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">排程時段管理</h2>
          <p className="text-slate-400 text-xm font-medium">設定不同時段的預約規則與公休日</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-bold hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-white flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
          <span>新增時程</span>
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
                      className="p-2 bg-white/5 hover:bg-rose-500/20 rounded-lg text-slate-300 hover:text-rose-400 transition-colors"
                    >
                      {isDeleting === menu.uid ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-white mb-2 group-hover:text-purple-400 transition-colors tracking-tight">
                  {menu.name || '未命名模板'}
                </h3>

                <div className="space-y-4 mt-auto pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2 text-ms text-slate-300 font-bold font-mono">
                    <Clock size={14} className="text-cyan-400" />
                    <span>更新於 {new Date(menu.update_at).toLocaleDateString('zh-TW')}</span>
                  </div>

                  <Link
                    href={`/schedules/${menu.uid}`}
                    className="w-full py-4 mt-2 bg-white/5 border border-white/10 rounded-2xl text-xm font-bold text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/20 flex items-center justify-center gap-2 group/btn transition-all shadow-sm"
                  >
                    <span>設定時段時程</span>
                    <ArrowRight size={18} className="group-hover/btn:translate-x-1.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-300">
            <Calendar className="w-12 h-12 mb-4 opacity-20" />
            <p>尚無任何時程模板，請點擊右上方新增。</p>
          </div>
        )}
      </div>
    </div>
  )
}
