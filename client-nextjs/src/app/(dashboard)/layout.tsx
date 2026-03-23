import { getAuthSession } from '@/services/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Calendar, LogOut, LayoutDashboard, ChevronRight, Clock } from 'lucide-react'
import { logoutAction } from '../actions/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col backdrop-blur-xl bg-white/5">
        <div className="p-8">
          <Link href="/members" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-white group-hover:scale-110 transition-transform">
              R
            </div>
            <span className="text-xl font-bold tracking-tight">管理系統</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarLink href="/members" icon={<Users size={20} />} label="會員管理" />
          <SidebarLink href="/bookings" icon={<Calendar size={20} />} label="預約管理" />
          <SidebarLink href="/schedules" icon={<Clock size={20} />} label="時程管理" />
          <SidebarLink href="/events" icon={<LayoutDashboard size={20} />} label="事件管理" />
        </nav>

        <div className="p-4 mt-auto border-t border-white/10">
          <div className="px-3 py-1 mb-2">
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase opacity-40">v0.1.1</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <span className="text-xs font-semibold text-purple-400">ADMIN</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.name}</p>
              <p className="text-xs text-slate-500 truncate">{session.account}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <LogOut size={18} />
              <span>登出系統</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[url('/login-bg.png')] bg-cover bg-fixed bg-center">
        <div className="min-h-full backdrop-blur-3xl bg-[#0a0a0a]/80 p-10">
          {children}
        </div>
      </main>
    </div>
  )
}

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  )
}
