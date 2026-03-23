'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Phone, Mail, ExternalLink, X, ChevronLeft, ChevronRight, User, Calendar, Clock, Tag, DollarSign, Ban, CheckCircle2, Loader2 } from 'lucide-react'
import type { Booking, BookingListProps } from '@/types'
import { cancelBooking } from '@/app/actions/bookings'
import { TIME_SLOT_INTERVAL } from '@/constants/common'
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export default function BookingList({
  initialBookings,
  totalCount,
  currentPage,
  pageSize,
  initialSearch
}: BookingListProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [searchValue, setSearchValue] = useState(initialSearch)
  const [isCancelling, setIsCancelling] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = Math.ceil(totalCount / pageSize)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (searchValue) {
      params.set('q', searchValue)
    } else {
      params.delete('q')
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', newSize.toString())
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleCancel = async (deleteType: number = 1) => {
    if (!selectedBooking) return
    if (!confirm('確定要取消此預約嗎？')) return

    setIsCancelling(true)
    // -- 0: 備份並刪除
    const res = await cancelBooking(selectedBooking.uid, TIME_SLOT_INTERVAL, 0)
    if (res.success) {
      setSelectedBooking(null)
      router.refresh()
    } else {
      alert('操作失敗: ' + (res.message || '未知錯誤'))
    }
    setIsCancelling(false)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜尋預約人、手機或服務名稱..."
            className="w-full pl-12 pr-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none focus:border-purple-500/50 transition-all text-white placeholder-slate-500"
          />
        </div>
        <button type="submit" className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 transition-all text-white">
          搜尋
        </button>
      </form>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-8 py-5 text-sm font-semibold text-slate-300">預約時間</th>
                <th className="px-8 py-5 text-sm font-semibold text-slate-300">預約人</th>
                <th className="px-8 py-5 text-sm font-semibold text-slate-300">服務項目</th>
                <th className="px-8 py-5 text-sm font-semibold text-slate-300">訂金/狀態</th>
                <th className="px-8 py-5 text-sm font-semibold text-slate-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialBookings.length > 0 ? initialBookings.map((booking) => (
                <tr
                  key={booking.uid}
                  onClick={() => setSelectedBooking(booking)}
                  className={`hover:bg-white/10 transition-colors group cursor-pointer ${booking.is_cancelled ? 'opacity-50' : ''}`}
                >
                  <td className="px-8 py-6 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-white font-medium">
                      <Calendar size={14} className="text-cyan-400" />
                      <span>{dayjs.utc(booking.booking_start_time).format('YYYY-MM-DD')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
                      <Clock size={14} className="text-cyan-400" />
                      <span>{dayjs.utc(booking.booking_start_time).format('HH:mm')}</span>
                      <span>~</span>
                      <span>{dayjs.utc(booking.booking_end_time).format('HH:mm')}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="font-medium text-white">{booking.name}</div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">{booking.phone}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-purple-400" />
                      <span className="text-slate-200">{booking.service_item}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 space-x-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${booking.is_deposit_received
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                      }`}>
                      {booking.is_deposit_received ? '已付訂金' : '未付訂金'}
                    </span>
                    {booking.is_cancelled && (
                      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        已取消
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <button className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                      <ExternalLink size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-500">
                    暫無預約資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-5 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-500">
              顯示第 <span className="text-white">{(currentPage - 1) * pageSize + 1}</span> 到 <span className="text-white">{Math.min(currentPage * pageSize, totalCount)}</span> 筆，共 <span className="text-white">{totalCount}</span> 筆
            </p>
            <div className="h-4 w-px bg-white/10 hidden md:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 lowercase font-mono">每頁顯示</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-purple-500/50 transition-all cursor-pointer"
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size} className="bg-[#111]">{size} 筆</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/20 transition-all text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-1">
              {totalPages > 0 ? [...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`min-w-[40px] h-10 rounded-xl text-sm font-medium transition-all ${currentPage === i + 1
                    ? 'bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/20'
                    : 'hover:bg-white/10 text-slate-400 hover:text-white border border-transparent hover:border-white/10'
                    }`}
                >
                  {i + 1}
                </button>
              )) : (
                <button className="min-w-[40px] h-10 rounded-xl text-sm font-medium bg-gradient-to-br from-purple-600/50 to-cyan-600/50 text-white opacity-50 cursor-default">
                  1
                </button>
              )}
            </div>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/20 transition-all text-white"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-[#111] border border-white/20 rounded-3xl overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-8 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-white/10">
                    <Calendar className="w-7 h-7 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">預約詳細資訊</h2>
                    <p className="text-slate-500 font-mono text-xs">{selectedBooking.uid}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 pt-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem icon={<User className="text-cyan-400" size={16} />} label="預約人" value={selectedBooking.name} />
                  <InfoItem icon={<Phone className="text-purple-400" size={16} />} label="手機電話" value={selectedBooking.phone} />
                  <div className="col-span-2">
                    <InfoItem icon={<Tag className="text-emerald-400" size={16} />} label="服務項目" value={selectedBooking.service_item} />
                  </div>
                  <InfoItem icon={<Clock className="text-yellow-400" size={16} />} label="開始時間" value={new Date(selectedBooking.booking_start_time).toLocaleString('zh-TW')} />
                  <InfoItem icon={<Clock className="text-rose-400" size={16} />} label="預約狀態" value={selectedBooking.is_cancelled ? '已取消' : (selectedBooking.is_deposit_received ? '已支付訂金' : '待支付')} />
                </div>

                {selectedBooking.notes && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase font-mono">備註事項</p>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 text-sm">
                      {selectedBooking.notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 pt-0 flex gap-3">
                {!selectedBooking.is_cancelled && (
                  <button
                    disabled={isCancelling}
                    onClick={() => handleCancel(1)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all text-slate-300 flex items-center justify-center gap-2"
                  >
                    {isCancelling ? <Loader2 className="animate-spin" size={18} /> : <Ban size={18} />}
                    取消預約
                  </button>
                )}
                <button
                  onClick={() => setSelectedBooking(null)}
                  disabled={isCancelling}
                  className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-semibold text-white disabled:opacity-50"
                >
                  關閉
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-mono">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-white font-medium pl-6">{value}</p>
    </div>
  )
}
