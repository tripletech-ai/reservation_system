
import { redirect } from 'next/navigation'
import DashboardNav from './DashboardNav'
import { ROUTES } from '@/constants/routes'
import { MANAGER_LEVEL } from '@/constants/common'
import { getSession } from '@/app/actions/superAuth'
import { Analytics } from "@vercel/analytics/next"



export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession(MANAGER_LEVEL.ADMIN)

  if (!session) {
    redirect(ROUTES.LOGIN)
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar (Responsive) */}
      <DashboardNav session={{ name: session.name || 'Admin', account: session.account || 'admin' }} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[url('/login-bg.png')] bg-cover bg-fixed bg-center">
        <div className="min-h-full backdrop-blur-3xl bg-black/80 px-4 py-8 sm:p-6 md:p-10">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
      <Analytics />
    </div>
  )
}


