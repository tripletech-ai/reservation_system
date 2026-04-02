'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ScheduleMenu } from '@/types'
import { createScheduleMenu, deleteScheduleMenu } from '@/app/actions/schedules'
import { useAlert } from '@/components/ui/DialogProvider'
import { ROUTES } from '@/constants/routes'

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
      router.push(ROUTES.ADMIN.SCHEDULE_EDIT(res.uid))
    } else {
      showAlert({ message: '建立失敗: ' + (res.message || '未知錯誤'), type: 'error' })
    }
    setIsCreating(false)
  }

  return (
    <div className="space-y-6 lg:space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">排程時段管理</h2>
          <p className="text-slate-400 text-xm font-bold uppercase tracking-widest opacity-60">規則與公休日設定</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-black hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-white flex items-center justify-center gap-2 shadow-xl cursor-pointer disabled:opacity-50"
        >
          {isCreating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
          <span>新增時程表</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {menus.length > 0 ? (
          menus.map((menu) => (
            <div key={menu.uid} className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all" />
              <div className="relative z-10 flex flex-col h-full font-bold">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3.5 bg-purple-500/10 rounded-2xl border border-purple-500/20 group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(menu.uid) }}
                    disabled={isDeleting === menu.uid}
                    className="p-2.5 bg-white/5 hover:bg-rose-500/20 rounded-xl text-slate-400 hover:text-rose-400 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    {isDeleting === menu.uid ? <div className="w-4 h-4 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" /> : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>}
                  </button>
                </div>
                <h3 className="text-xl font-black text-white mb-2 group-hover:text-purple-400 transition-colors">{menu.name || '未命名時程'}</h3>
                <div className="mt-auto pt-6 border-t border-white/5">
                  <Link
                    href={ROUTES.ADMIN.SCHEDULE_EDIT(menu.uid)}
                    className="w-full py-4 mt-2 bg-white/10 border border-white/10 rounded-2xl text-ms font-black text-slate-200 hover:bg-white/20 hover:text-white flex items-center justify-center gap-2 group/btn transition-all shadow-inner uppercase tracking-wider"
                  >
                    <span>設定規則詳情</span>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover/btn:translate-x-1.5 transition-transform"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-300 font-bold">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-10"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <p>尚無任何時程，請點擊新增。</p>
          </div>
        )}
      </div>
    </div>
  )
}
