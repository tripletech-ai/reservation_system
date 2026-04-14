'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/constants/routes'
import { logoutAction } from '@/app/actions/superAuth'
import { MANAGER_LEVEL } from '@/constants/common'
import { Manager } from '@/types'


export default function DashboardNav(session: Manager) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const toggleSidebar = () => setIsOpen(!isOpen)
  const handleLogout = logoutAction.bind(null, MANAGER_LEVEL.ADMIN);

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40 font-bold">
        <Link href={ROUTES.ADMIN.MEMBERS} className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center text-white">R</div>
          {/* <span className="text-xl tracking-tight text-white">{session.name}</span>
          <span className="text-xl tracking-tight text-white">{session.website_name}</span> */}
        </Link>
        <button onClick={toggleSidebar} className="p-2 text-slate-400 hover:text-white cursor-pointer">
          {isOpen ? <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> : <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-50 border-r border-white/10 flex flex-col backdrop-blur-xl bg-black/90 md:bg-white/5 md:relative transform transition-transform duration-300 ease-in-out font-bold ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-8 hidden md:block">
          <Link href={ROUTES.ADMIN.MEMBERS} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform font-black shrink-0">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xl tracking-tight text-white font-black leading-tight">
                {session.account}
              </span>
              <p className="text-base tracking-tight text-gray-400 font-bold leading-tight">
                {session.website_name}
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 md:mt-0">
          <SidebarLink href={ROUTES.ADMIN.MEMBERS} label="會員管理" active={pathname === ROUTES.ADMIN.MEMBERS} onClick={() => setIsOpen(false)} icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} />
          <SidebarLink href={ROUTES.ADMIN.BOOKINGS} label="預約管理" active={pathname === ROUTES.ADMIN.BOOKINGS} onClick={() => setIsOpen(false)} icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>} />
          <SidebarLink href={ROUTES.ADMIN.SCHEDULES} label="時程管理" active={pathname === ROUTES.ADMIN.SCHEDULES} onClick={() => setIsOpen(false)} icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} />
          <SidebarLink href={ROUTES.ADMIN.EVENTS} label="預約項目" active={pathname === ROUTES.ADMIN.EVENTS} onClick={() => setIsOpen(false)} icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>} />
        </nav>

        <div className="p-4 mt-auto border-t border-white/10 font-bold">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-4">
            <div className="p-2 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-[12px] font-black text-purple-400">ADMIN</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xm truncate text-white">{session.name}</p>
              <p className="text-ms text-slate-300 truncate opacity-60">@{session.account}</p>
            </div>
          </div>
          <form action={handleLogout}>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>登出系統</span>
            </button>
          </form>
        </div>
      </aside>

      {isOpen && <div onClick={toggleSidebar} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" />}
    </>
  )
}

function SidebarLink({ href, label, active, onClick, icon }: { href: string; label: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${active ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-bold">{label}</span>
      </div>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><polyline points="9 18 15 12 9 6"></polyline></svg>
    </Link>
  )
}
