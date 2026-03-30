import { getSession } from '@/app/actions/superAuth'

import { SuperAdminProvider } from './SuperAdminContext'
import { MANAGER_LEVEL } from '@/constants/common'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession(MANAGER_LEVEL.SUPER)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30">
      <SuperAdminProvider>
        {children}
      </SuperAdminProvider>
    </div>
  )
}
