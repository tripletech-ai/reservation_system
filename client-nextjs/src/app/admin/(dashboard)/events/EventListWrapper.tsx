'use client'

import dynamic from 'next/dynamic'
import type { EventListProps } from '@/types'

const EventList = dynamic(() => import('./EventList'), {
  ssr: false,
  loading: () => <div className="p-8 animate-pulse bg-white/5 rounded-3xl h-64" />
})

export default function EventListWrapper(props: EventListProps) {
  return <EventList {...props} />
}
