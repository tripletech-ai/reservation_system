'use client'

import dynamic from 'next/dynamic'

const ManagerEditClient = dynamic(() => import('./ManagerEditClient'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0a0a0a]" />
})

export default function ManagerEditPage() {
  return <ManagerEditClient />
}
