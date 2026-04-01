import { getBookings } from '@/services/data'
import { Calendar, Clock, DollarSign } from 'lucide-react'
import BookingListWrapper from './BookingListWrapper'
import { BOOKING_STATUS, MANAGER_LEVEL } from '@/constants/common'
import { getSession } from '@/app/actions/superAuth'

export const runtime = "edge";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>
}) {
  const session = await getSession(MANAGER_LEVEL.ADMIN)
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

  const todayCount = bookings.filter(b => new Date(b.booking_start_time).toDateString() === new Date().toDateString()).length
  const pendingDeposit = bookings.filter(b => !b.is_deposit_received && b.status != BOOKING_STATUS.CANCELLED).length

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">預約管理</h1>
          <p className="text-slate-400 mt-1">追蹤並管理所有客戶預約狀態</p>
        </div>
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

      <BookingListWrapper
        initialBookings={bookings}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        initialSearch={q}
        session={session}
      />
    </div>
  )
}

function StatsCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl hover:border-white/20 transition-all group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xm font-medium text-slate-300 font-mono uppercase tracking-tighter">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform duration-300 border border-white/5">
          {icon}
        </div>
      </div>
    </div>
  )
}
