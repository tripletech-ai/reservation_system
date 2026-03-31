import { getBookingInfo } from '@/services/data'
import { notFound, redirect } from 'next/navigation'
import BookingClient from './BookingClient'
import LiffInitializer from '@/components/line/LiffInitializer'
import { BookingClientProps } from '@/types';
import { ROUTES } from '@/constants/routes';

type Props = {
  params: Promise<{ websiteName: string; dynamicUrl: string }>;
  searchParams: Promise<{ schedule_menu_uid?: string; line_uid?: string }>;
};

export default async function BookingPage({ params, searchParams }: Props) {
  const { websiteName, dynamicUrl } = await params
  const { schedule_menu_uid, line_uid } = await searchParams

  // // 1. 如果 URL 缺少 line_uid，則先進入 Client Side 的 LIFF 初始化與身分確認
  if (!line_uid) {
    return <LiffInitializer />
  }

  const data = await getBookingInfo(websiteName, dynamicUrl, schedule_menu_uid, line_uid)
  if (!data) {
    notFound()
  }

  // 如果提供了 line_uid 但找不到會員，跳轉到註冊頁面 (依據參考邏輯)
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
  }

  return (
    <BookingClient {...info} />
  )
}
