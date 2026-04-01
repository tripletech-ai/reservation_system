'use client'

import dynamic from 'next/dynamic'
import type { BookingClientProps } from '@/types'

const BookingClient = dynamic(() => import('./BookingClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
    </div>
  )
})

export default function BookingWrapper(props: BookingClientProps) {
  return <BookingClient {...props} />
}
