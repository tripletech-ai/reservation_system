
import { getEventDetails, getScheduleMenus } from '@/services/data'
import { redirect, notFound } from 'next/navigation'
import EventEditForm from './EventEditForm'
import { getSession } from '@/app/actions/superAuth'
import { MANAGER_LEVEL } from '@/constants/common'


export default async function EventEditPage({ params }: { params: { id: string } }) {
  const session = await getSession(MANAGER_LEVEL.ADMIN)
  if (!session) return null

  const { id } = await params
  const isNew = id === 'new'

  const [initialEvent, menus] = await Promise.all([
    isNew ? Promise.resolve(null) : getEventDetails(id),
    getScheduleMenus(session.uid)
  ])

  if (!isNew && !initialEvent) notFound()

  return (
    <div className="p-8 pb-24">
      <EventEditForm
        id={id}
        managerUid={session.uid}
        managerWebsiteName={session.website_name}
        initialEvent={initialEvent?.event ?? null}
        menus={menus}
      />
    </div>
  )
}
