import { getAuthSession } from '@/services/auth'
import { getScheduleMenus } from '@/services/data'
import ScheduleList from './ScheduleList'

export default async function SchedulesPage() {
  const session = await getAuthSession()
  if (!session) return null

  const menus = await getScheduleMenus(session.uid)

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">時程管理</h1>
          <p className="text-slate-400">管理各類時程、設定營業時段與特定休閒日。</p>
        </div>
      </div>

      <ScheduleList menus={menus} managerUid={session.uid} />
    </div>
  )
}
