import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/superAuth'

import { SuperAdminProvider } from './SuperAdminContext'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30">
      <SuperAdminProvider>
        {children}
      </SuperAdminProvider>
    </div>
  )
}
