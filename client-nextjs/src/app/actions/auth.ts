'use server'

import { verifyManagerLogin } from '@/services/auth'
import { cookies } from 'next/headers'

export async function loginAction(formData: FormData) {
  const account = formData.get('account') as string
  const password = formData.get('password') as string

  const result = await verifyManagerLogin(account, password)
  
  if (result.success && result.user) {
    const cookieStore = await cookies()
    cookieStore.set('manager_session', JSON.stringify(result.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })
  }

  return result
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('manager_session')
}
