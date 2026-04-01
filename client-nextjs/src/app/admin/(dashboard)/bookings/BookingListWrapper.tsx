'use client'

import dynamic from 'next/dynamic'
import type { BookingListProps } from '@/types'

const BookingList = dynamic(() => import('./BookingList'), {
  ssr: false,
  loading: () => <div className="p-8 animate-pulse bg-white/5 rounded-3xl h-64" />
})

export default function BookingListWrapper(props: BookingListProps) {
  return <BookingList {...props} />
}
