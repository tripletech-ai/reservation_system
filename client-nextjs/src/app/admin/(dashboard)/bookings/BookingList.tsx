'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Phone, Mail, ExternalLink, X, ChevronLeft, ChevronRight, User, Calendar, Clock, Tag, DollarSign, Ban, CheckCircle2, Loader2 } from 'lucide-react'
import type { Booking, BookingListProps } from '@/types'
import { useAlert } from '@/components/ui/DialogProvider'
import { cancelBooking, updateBookingDepositStatus } from '@/app/actions/bookings'
import { BOOKING_STATUS, TIME_SLOT_INTERVAL } from '@/constants/common'
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { TimeUtils } from '@/lib/TimeUtils'
dayjs.extend(utc);

export default function BookingList({
  initialBookings,
  totalCount,
  currentPage,
  pageSize,
  initialSearch,
  session
}: BookingListProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [searchValue, setSearchValue] = useState(initialSearch)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [tempDepositStatus, setTempDepositStatus] = useState<boolean>(false)
  const router = useRouter()
  const { showAlert, showConfirm } = useAlert()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (selectedBooking) {
      setTempDepositStatus(selectedBooking.is_deposit_received)
    }
  }, [selectedBooking])

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

  const handleCancel = async (deleteType: number = 0) => {
    if (!selectedBooking) return
    const isConfirmed = await showConfirm({
      message: '確定要取消此預約嗎？',
      type: 'warning',
      confirmText: '確定取消',
      cancelText: '保留預約'
    })
    if (!isConfirmed) return

    setIsCancelling(true)
    // -- 0: 備份並刪除
    const res = await cancelBooking(selectedBooking.uid, session, TIME_SLOT_INTERVAL, deleteType)
    if (res.success) {
      setSelectedBooking(null)
      router.refresh()
    } else {
      showAlert({ message: '操作失敗: ' + (res.message || '未知錯誤'), type: 'error' })
    }
    setIsCancelling(false)
  }

  const handleUpdateStatus = async () => {
    if (!selectedBooking) return
    setIsSaving(true)
    const res = await updateBookingDepositStatus(selectedBooking.uid, tempDepositStatus)
    if (res.success) {
      setSelectedBooking({ ...selectedBooking, is_deposit_received: tempDepositStatus })
      router.refresh()
    } else {
      showAlert({ message: '儲存失敗: ' + (res.message || '未知錯誤'), type: 'error' })
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜尋預約人、手機或服務名稱..."
            className="w-full pl-12 pr-4 py-3 bg-white/10 rounded-xl border border-white/10 outline-none focus:border-purple-500/50 transition-all text-white placeholder-slate-400"
          />
        </div>
        <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-white">
          搜尋
        </button>
      </form>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
        <div className="overflow-x-auto scrollbar-hide md:scrollbar-default">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-5 text-xm font-bold text-slate-300 uppercase tracking-wider">預約時間</th>
                <th className="px-6 py-5 text-xm font-bold text-slate-300 uppercase tracking-wider">預約人</th>
                <th className="px-6 py-5 text-xm font-bold text-slate-300 uppercase tracking-wider">服務項目</th>
                <th className="px-6 py-5 text-xm font-bold text-slate-300 uppercase tracking-wider">狀態</th>
                <th className="px-6 py-5 text-xm font-bold text-slate-300 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialBookings.length > 0 ? initialBookings.map((booking) => (
                <tr
                  key={booking.uid}
                  onClick={() => setSelectedBooking(booking)}
                  className={`hover:bg-white/10 transition-colors group cursor-pointer ${booking.status === BOOKING_STATUS.CANCELLED ? 'opacity-40' : ''}`}
                >
                  <td className="px-6 py-5 space-y-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xm text-white font-bold">
                      <Calendar size={14} className="text-cyan-400 shrink-0" />
                      <span>{TimeUtils.getDatePart(booking.booking_start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-slate-300 font-mono font-bold tracking-tight">
                      <Clock size={14} className="text-cyan-400 shrink-0" />
                      <span>{TimeUtils.getTimePart(booking.booking_start_time)}</span>
                      <span className="opacity-40">—</span>
                      <span>{TimeUtils.getTimePart(booking.booking_end_time)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="font-bold text-white text-[15px]">{booking.name}</div>
                    <div className="text-[13px] text-slate-400 mt-1 font-mono font-bold tracking-wider">{booking.phone}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-purple-400 shrink-0" />
                      <span className="text-slate-100 font-bold text-xm whitespace-nowrap">{booking.service_item}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[14px] font-black uppercase tracking-widest border ${booking.is_deposit_received
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                        {booking.is_deposit_received ? '已付訂金' : '待付訂金'}
                      </span>
                      {booking.status === BOOKING_STATUS.CANCELLED && (
                        <span className="inline-flex px-2 py-1 rounded-full text-[14px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          已取消
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all inline-flex items-center">
                      <ExternalLink size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-300">
                    暫無預約資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-5 border-t border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6 bg-white/[0.02]">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <p className="text-xm text-slate-400 font-bold">
              顯示第 <span className="text-white">{(currentPage - 1) * pageSize + 1}</span> 到 <span className="text-white">{Math.min(currentPage * pageSize, totalCount)}</span> 筆，共 <span className="text-white font-black">{totalCount}</span> 筆
            </p>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-ms text-slate-300 uppercase font-black tracking-tighter">每頁</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-ms text-white outline-none focus:border-purple-500/50 transition-all cursor-pointer font-bold"
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
            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
              {totalPages > 0 ? [...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`min-w-[40px] h-10 rounded-xl text-xm font-bold transition-all ${currentPage === i + 1
                    ? 'bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/30'
                    : 'hover:bg-white/10 text-slate-400 hover:text-white border border-transparent hover:border-white/10'
                    }`}
                >
                  {i + 1}
                </button>
              )) : (
                <button className="min-w-[40px] h-10 rounded-xl text-xm font-medium bg-gradient-to-br from-purple-600/50 to-cyan-600/50 text-white opacity-50 cursor-default">
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-white/10">
                    <Calendar className="w-7 h-7 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">預約詳細資訊</h2>
                    <p className="text-slate-300 font-mono text-ms mt-1">{selectedBooking.uid}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 no-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <InfoItem icon={<User className="text-cyan-400" size={16} />} label="預約人" value={selectedBooking.name} />
                  <InfoItem icon={<Phone className="text-purple-400" size={16} />} label="手機電話" value={selectedBooking.phone} />
                  <div className="col-span-1 sm:col-span-2">
                    <InfoItem icon={<Tag className="text-emerald-400" size={16} />} label="服務項目" value={selectedBooking.service_item} />
                  </div>
                  <InfoItem icon={<Clock className="text-yellow-400" size={16} />} label="開始時間" value={TimeUtils.getDateTime(selectedBooking.booking_start_time)} />
                  <div className="space-y-2">
                    <p className="text-[14px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-2">
                      <DollarSign size={14} className="text-emerald-400" /> 訂金支付狀態
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setTempDepositStatus(!tempDepositStatus)}
                        className={`relative w-12 h-6 rounded-full transition-all duration-200 outline-none flex items-center ${tempDepositStatus ? 'bg-emerald-600 shadow-inner' : 'bg-slate-700 shadow-inner'}`}
                      >
                        <motion.div
                          animate={{ x: tempDepositStatus ? 26 : 4 }}
                          className="w-4 h-4 bg-white rounded-full shadow-lg"
                        />
                      </button>
                      <span className={`text-xm font-bold ${tempDepositStatus ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {tempDepositStatus ? '已付訂金' : '待支付'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[14px] text-slate-400 uppercase font-black tracking-widest">備註事項</p>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-3xl text-slate-200 text-xm leading-relaxed whitespace-pre-wrap">
                      {selectedBooking.notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 pt-0 flex gap-3">
                {tempDepositStatus !== selectedBooking.is_deposit_received && (
                  <button
                    disabled={isSaving}
                    onClick={handleUpdateStatus}
                    className="flex-[1.5] py-4 bg-emerald-600 rounded-2xl font-bold text-white hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    儲存訂金狀態
                  </button>
                )}
                {selectedBooking.status !== BOOKING_STATUS.CANCELLED && (
                  <button
                    disabled={isCancelling || isSaving}
                    onClick={() => handleCancel()}
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
      <div className="flex items-center gap-2 text-slate-300 text-ms uppercase font-mono">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-white font-medium pl-6">{value}</p>
    </div>
  )
}
