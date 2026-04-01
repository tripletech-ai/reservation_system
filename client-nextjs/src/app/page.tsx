'use client'

import dynamic from 'next/dynamic'

const LandingClient = dynamic(() => import('@/components/landing/LandingClient'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#050505]" />
})

export default function LandingPage() {
  return <LandingClient />
}
