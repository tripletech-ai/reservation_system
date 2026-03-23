import { getAuthSession } from '@/services/auth'
import { getEvents, getScheduleMenus } from '@/services/data'
import { redirect } from 'next/navigation'
import EventList from './EventList'

export default async function EventsPage() {
  const session = await getAuthSession()
  if (!session) redirect('/login')

  const [events, menus] = await Promise.all([
    getEvents(session.uid),
    getScheduleMenus(session.uid)
  ])

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">預約項目管理</h1>
          <p className="text-slate-400 mt-2">設定您的服務內容、分類以及對應的營業時間</p>
        </div>
      </div>

      <EventList events={events} menus={menus} managerUid={session.uid} managerWebsiteName={session.website_name} />
    </div>
  )
}
