'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { Booking, BookingListProps } from '@/types'
import { useAlert } from '@/components/ui/DialogProvider'
import { cancelBooking, updateBookingDepositStatus, updateBookingStatus } from '@/app/actions/bookings'
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
    const res = await cancelBooking(selectedBooking, session, TIME_SLOT_INTERVAL, deleteType)
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

  const handleToggleDeposit = async (booking: Booking) => {
    const isConfirmed = await showConfirm({
      message: `確定要將此預約標記為「${booking.is_deposit_received ? '待付訂金' : '已付訂金'}」嗎？`,
      type: 'info'
    })
    if (!isConfirmed) return

    const res = await updateBookingDepositStatus(booking.uid, !booking.is_deposit_received)
    if (res.success) {
      router.refresh()
    } else {
      showAlert({ message: '更新失敗', type: 'error' })
    }
  }

  const handleToggleBookingStatus = async (booking: Booking) => {
    const isBooking = booking.status === BOOKING_STATUS.REVIEW
    const newStatus = isBooking ? BOOKING_STATUS.BOOKING_SUCCESS : BOOKING_STATUS.REVIEW
    const statusText = isBooking ? '預約成功' : '審核中'

    const isConfirmed = await showConfirm({
      message: `確定要將此預約狀態切換為「${statusText}」嗎？`,
      type: 'info'
    })
    if (!isConfirmed) return

    const res = await updateBookingStatus(booking, session, newStatus)
    if (res.success) {
      router.refresh()
    } else {
      showAlert({ message: '更新失敗', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜尋預約人、手機或服務名稱..."
            className="w-full pl-12 pr-4 py-3 bg-white/10 rounded-xl border border-white/10 outline-none focus:border-purple-500/50 transition-all text-white placeholder-slate-400 font-bold"
          />
        </div>
        <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-white cursor-pointer">
          搜尋
        </button>
      </form>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
        <div className="overflow-x-auto scrollbar-hide md:scrollbar-default">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-xm font-bold text-slate-300 uppercase tracking-wider">預約時間</th>
                <th className="px-4 py-3 text-xm font-bold text-slate-300 uppercase tracking-wider">預約人</th>
                <th className="px-4 py-3 text-xm font-bold text-slate-300 uppercase tracking-wider">服務項目</th>
                <th className="px-4 py-3 text-xm font-bold text-slate-300 uppercase tracking-wider">訂金狀態</th>
                <th className="px-4 py-3 text-xm font-bold text-slate-300 uppercase tracking-wider">預約狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialBookings.length > 0 ? initialBookings.map((booking) => (
                <tr
                  key={booking.uid}
                  onClick={() => setSelectedBooking(booking)}
                  className={`hover:bg-white/10 transition-colors group cursor-pointer ${booking.status === BOOKING_STATUS.CANCELLED ? 'opacity-40' : ''}`}
                >
                  <td className="px-4 py-3 space-y-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xm text-white font-bold">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      <span>{TimeUtils.getDatePart(booking.booking_start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-slate-300 font-mono font-bold tracking-tight">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 shrink-0"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      <span>{TimeUtils.getTimePart(booking.booking_start_time)}</span>
                      <span className="opacity-40">—</span>
                      <span>{TimeUtils.getTimePart(booking.booking_end_time)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-bold text-white text-[15px]">{booking.name}</div>
                    <div className="text-[13px] text-slate-400 mt-1 font-mono font-bold tracking-wider">{booking.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 shrink-0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7" y2="7"></line></svg>
                      <span className="text-slate-100 font-bold text-xm whitespace-nowrap">{booking.service_item}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={booking.is_deposit_received}
                        onChange={() => handleToggleDeposit(booking)}
                      />
                      <span className={`text-[13px] font-black tracking-wide ${booking.is_deposit_received ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {booking.is_deposit_received ? '已付訂金' : '待付訂金'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(booking.status == BOOKING_STATUS.REVIEW || booking.status == BOOKING_STATUS.BOOKING_SUCCESS) && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={booking.status === BOOKING_STATUS.BOOKING_SUCCESS}
                          onChange={() => handleToggleBookingStatus(booking)}
                        />
                        <span className={`text-[13px] font-black tracking-wide ${booking.status === BOOKING_STATUS.BOOKING_SUCCESS ? 'text-cyan-400' : 'text-purple-400'}`}>
                          {booking.status === BOOKING_STATUS.BOOKING_SUCCESS ? '預約成功' : '審核中'}
                        </span>
                      </div>
                    )}
                    {booking.status === BOOKING_STATUS.CANCELLED && (
                      <span className="inline-flex px-3 py-1 rounded-full text-[12px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30 w-fit">
                        已取消
                      </span>
                    )}
                    {booking.status === BOOKING_STATUS.APPLY_CANCELED && (
                      <span className="inline-flex px-3 py-1 rounded-full text-[12px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 w-fit">
                        申請取消中
                      </span>
                    )}

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

        <div className="px-4 py-3 border-t border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6 bg-white/[0.02]">
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
                className="bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-ms text-white outline-none focus:border-purple-500/50 transition-all cursor-pointer font-bold"
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
              className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/20 transition-all text-white cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
              {totalPages > 0 ? [...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`min-w-[40px] h-10 rounded-xl text-xm font-bold transition-all ${currentPage === i + 1
                    ? 'bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/30'
                    : 'hover:bg-white/10 text-slate-400 hover:text-white border border-transparent hover:border-white/10'
                    } cursor-pointer`}
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
              className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/20 transition-all text-white cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      </div>


      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedBooking(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col"
          >
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-white/10">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">預約詳細資訊</h2>
                  <p className="text-slate-300 font-mono text-ms mt-1">{selectedBooking.uid}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white cursor-pointer">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 no-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>} label="預約人" value={selectedBooking.name} />
                <InfoItem icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>} label="手機電話" value={selectedBooking.phone} />
                <div className="col-span-1  sm:col-span-2">
                  <InfoItem icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7" y2="7"></line></svg>} label="服務項目" value={selectedBooking.service_item} />
                </div>
                <InfoItem icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} label="開始時間" value={TimeUtils.getDateTime(selectedBooking.booking_start_time)} />
                <div className="space-y-2">
                  <p className="text-[14px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-2">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> 訂金支付狀態
                  </p>
                  <div className="pl-6 flex items-center gap-3">
                    <span className={`text-xm font-bold ${selectedBooking.is_deposit_received ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {selectedBooking.is_deposit_received ? '已付訂金' : '待支付'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[14px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-2">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> 預約狀態
                  </p>
                  <div className="pl-6 flex items-center gap-3">
                    <span className={`text-xm font-bold ${selectedBooking.status === BOOKING_STATUS.BOOKING_SUCCESS ? 'text-cyan-400' : 'text-purple-400'}`}>
                      {selectedBooking.status === BOOKING_STATUS.BOOKING_SUCCESS ? '預約成功' : (selectedBooking.status === BOOKING_STATUS.CANCELLED ? '已取消' : '審核中')}
                    </span>
                  </div>
                </div>
              </div>

              {/* {selectedBooking.notes && (
                <div className="space-y-2 pt-2">
                  <p className="text-[14px] text-slate-400 uppercase font-black tracking-widest">備註事項</p>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-3xl text-slate-200 text-xm leading-relaxed whitespace-pre-wrap font-bold">
                    {selectedBooking.notes}
                  </div>
                </div>
              )} */}
            </div>

            <div className="p-8 pt-0 flex gap-3">
              {selectedBooking.status !== BOOKING_STATUS.CANCELLED && (
                <button
                  disabled={isCancelling || isSaving}
                  onClick={() => handleCancel()}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all text-slate-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isCancelling ? (
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                  )}
                  取消預約
                </button>
              )}
              <button
                onClick={() => setSelectedBooking(null)}
                disabled={isCancelling}
                className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={`relative w-10 min-w-[40px] h-5 rounded-full transition-all duration-200 outline-none flex items-center cursor-pointer ${checked ? 'bg-purple-600 shadow-inner' : 'bg-slate-700 shadow-inner'}`}
    >
      <div
        className={`w-3.5 h-3.5 bg-white rounded-full shadow-lg transition-transform duration-200 transform ${checked ? 'translate-x-[22px]' : 'translate-x-[3px]'}`}
      />
    </button>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-slate-300 text-ms uppercase font-mono font-bold">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-white font-bold pl-6">{value}</p>
    </div>
  )
}
