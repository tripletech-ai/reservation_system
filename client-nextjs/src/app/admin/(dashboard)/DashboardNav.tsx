'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Calendar,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  Clock,
  Menu,
  X
} from 'lucide-react'

import { ROUTES } from '@/constants/routes'
import { logoutAction } from '@/app/actions/superAuth'
import { MANAGER_LEVEL } from '@/constants/common'


interface DashboardNavProps {
  session: {
    name: string
    account: string
  }
}

export default function DashboardNav({ session }: DashboardNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const toggleSidebar = () => setIsOpen(!isOpen)
  const handleLogout = logoutAction.bind(null, MANAGER_LEVEL.ADMIN);
  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href={ROUTES.ADMIN.MEMBERS} className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-white">
            R
          </div>
          <span className="text-xl font-bold tracking-tight text-white">管理系統</span>
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-2 text-slate-400 hover:text-white"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar - CSS based responsiveness to fix hydration error */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 flex flex-col backdrop-blur-xl bg-black/90 md:bg-white/5 md:relative 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 hidden md:block">
          <Link href={ROUTES.ADMIN.MEMBERS} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-white group-hover:scale-110 transition-transform">
              R
            </div>
            <span className="text-xl font-bold tracking-tight text-white">管理系統</span>
          </Link>
        </div>

        <div className="md:hidden p-8 flex justify-between items-center">
          <Link href={ROUTES.ADMIN.MEMBERS} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-white">
              R
            </div>
            <span className="text-xl font-bold tracking-tight text-white">管理系統</span>
          </Link>
          <button onClick={toggleSidebar} className="text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 md:mt-0">
          <SidebarLink href={ROUTES.ADMIN.MEMBERS} icon={<Users size={20} />} label="會員管理" active={pathname === ROUTES.ADMIN.MEMBERS} onClick={() => setIsOpen(false)} />
          <SidebarLink href={ROUTES.ADMIN.BOOKINGS} icon={<Calendar size={20} />} label="預約管理" active={pathname === ROUTES.ADMIN.BOOKINGS} onClick={() => setIsOpen(false)} />
          <SidebarLink href={ROUTES.ADMIN.SCHEDULES} icon={<Clock size={20} />} label="時程管理" active={pathname === ROUTES.ADMIN.SCHEDULES} onClick={() => setIsOpen(false)} />
          <SidebarLink href={ROUTES.ADMIN.EVENTS} icon={<LayoutDashboard size={20} />} label="事件管理" active={pathname === ROUTES.ADMIN.EVENTS} onClick={() => setIsOpen(false)} />
        </nav>

        <div className="p-4 mt-auto border-t border-white/10">
          <div className="px-3 py-1 mb-2">
            <span className="text-[14px] font-bold text-slate-300 tracking-widest uppercase opacity-60">v0.1.1</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <span className="text-[14px] font-bold text-purple-400">ADMIN</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xm font-medium truncate text-white">{session.name}</p>
              <p className="text-ms text-slate-300 truncate">{session.account}</p>
            </div>
          </div>
          <form action={handleLogout}>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <LogOut size={18} />
              <span>登出系統</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Overlay Darken */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
        />
      )}
    </>
  )
}

function SidebarLink({
  href,
  icon,
  label,
  active,
  onClick
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center justify-between px-4 py-3 rounded-xl transition-all group
        ${active
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-white/5'}
      `}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-semibold">{label}</span>
      </div>
      <ChevronRight
        size={16}
        className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      />
    </Link>
  )
}
