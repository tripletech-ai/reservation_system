import { getAuthSession } from '@/services/auth'
import { getBookings } from '@/services/data'
import { Calendar, Clock, DollarSign, Filter } from 'lucide-react'
import BookingList from './BookingList'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>
}) {
  const session = await getAuthSession()
  if (!session) return null

  const params = await searchParams
  const q = params.q || ''
  const page = parseInt(params.page || '1')
  const pageSize = parseInt(params.pageSize || '10')

  const { bookings, totalCount } = await getBookings(session.uid, {
    searchTerm: q,
    page,
    pageSize
  })

  // 這裡統計建議還是從資料庫另外抓或用目前的數據 (分頁會導致統計不準，但通常後台首頁會顯示總計)
  // 為了演示，我們這裡暫且以目前分頁資料為例，或者你之後可以新增一個 getBookingStats 的 service
  const todayCount = bookings.filter(b => new Date(b.booking_start_time).toDateString() === new Date().toDateString()).length
  const pendingDeposit = bookings.filter(b => !b.is_deposit_received && !b.is_cancelled).length
  const cancelledCount = bookings.filter(b => b.is_cancelled).length

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">預約管理</h1>
          <p className="text-slate-400 mt-1">追蹤並管理所有客戶預約狀態</p>
        </div>
        <button className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-semibold shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all">
          新增預約
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          label="今日預約"
          value={todayCount}
          icon={<Clock className="text-purple-400" />}
        />
        <StatsCard
          label="待付訂金"
          value={pendingDeposit}
          icon={<DollarSign className="text-emerald-400" />}
        />

        <StatsCard
          label="總預約數"
          value={totalCount}
          icon={<Calendar className="text-cyan-400" />}
        />
      </div>

      <BookingList
        initialBookings={bookings}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        initialSearch={q}
      />
    </div>
  )
}

function StatsCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl hover:border-white/20 transition-all group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 font-mono uppercase tracking-tighter">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform duration-300 border border-white/5">
          {icon}
        </div>
      </div>
    </div>
  )
}
