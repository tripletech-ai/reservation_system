import { redirect } from 'next/navigation'
import { getSuperSession } from '@/app/actions/superAuth'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSuperSession()
  
  // Exclude login page from redirect
  // Note: we'll handle login redirection inside the page component or middleware if needed.
  // But for simple implementation:
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30">
      {children}
    </div>
  )
}
