import { getAuthSession } from '@/services/auth'
import { getScheduleDetails } from '@/services/data'
import ScheduleForm from './ScheduleForm'
import { notFound } from 'next/navigation'
import { ScheduleData } from '@/types'

export default async function ScheduleEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getAuthSession()
  if (!session) return null

  const { id } = await params
  const isNew = id === 'new'

  let initialData: ScheduleData = {
    menu: null,
    times: [],
    overrides: [],
  }

  if (!isNew) {
    const data = await getScheduleDetails(id)
    initialData = data
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <ScheduleForm
        id={id}
        managerUid={session.uid}
        initialData={initialData}
      />
    </div>
  )
}
