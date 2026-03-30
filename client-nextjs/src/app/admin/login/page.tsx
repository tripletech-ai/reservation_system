
import { redirect } from 'next/navigation'
import LoginClient from './LoginClient'
import { ROUTES } from '@/constants/routes'
import { MANAGER_LEVEL } from '@/constants/common'
import { getSession } from '@/app/actions/superAuth'

export default async function LoginPage() {
  const session = await getSession(MANAGER_LEVEL.ADMIN)

  // 如果已經登入，直接跳轉到成員列表
  if (session) {
    redirect(ROUTES.ADMIN.HOME)
  }

  return <LoginClient />
}
