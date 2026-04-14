import { getBookingInfo } from '@/services/data'
import { notFound, redirect } from 'next/navigation'
import LiffInitializer from '@/components/line/LiffInitializer'
import { BookingClientProps } from '@/types';
import { ROUTES } from '@/constants/routes';
import { CONFIG_ENV } from '@/lib/env';
import BookingClient from './BookingClient';
import { Analytics } from "@vercel/analytics/next"


type Props = {
  params: Promise<{ websiteName: string; dynamicUrl: string }>;
  searchParams: Promise<{ schedule_menu_uid?: string; line_uid?: string; limit?: string }>;
};

export default async function BookingPage({ params, searchParams }: Props) {
  const { websiteName, dynamicUrl } = await params
  let { schedule_menu_uid, line_uid, limit } = await searchParams


  const data = await getBookingInfo(websiteName, dynamicUrl, schedule_menu_uid, line_uid)
  if (!data) {
    notFound()
  }

  if (CONFIG_ENV.nodeEnv != 'development' && !line_uid && limit != 'false' && data.event.line_liff_id) {
    return <LiffInitializer liffId={data.event.line_liff_id} />
  }


  if (line_uid && !data.is_member) {
    const query = new URLSearchParams({
      line_uid,
      manager_uid: data.event.manager_uid,
      return_url: ROUTES.BOOKING(websiteName, dynamicUrl, schedule_menu_uid, line_uid),
      questionnaire: JSON.stringify(data.manager?.questionnaire)
    }).toString()

    redirect(ROUTES.REGISTER(query))
  }

  const info: BookingClientProps = {
    is_member: true,
    manager: data.manager || null,
    event: data.event,
    schedule: data.schedule,
    booking_cache: data.booking_cache,
    line_uid: line_uid || '',
    limit: limit != "false"
  }

  return <><BookingClient {...info} /><Analytics /></>
}
