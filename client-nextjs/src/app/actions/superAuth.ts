'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function superLoginAction(formData: FormData) {
  const account = formData.get('account') as string
  const password = formData.get('password') as string

  // Simple check for super admin.
  // In production, we should check a specific table or a column like is_super_admin.
  // For now, let's assume account 'admin' is the super admin.

  const { data: user, error } = await supabaseAdmin
    .from('manager')
    .select('*')
    .eq('account', account)
    .eq('password', password)
    .eq('level', '1')
    .single()

  if (error || !user) {
    return { success: false, message: '管理員帳號或密碼錯誤' }
  }

  const cookieStore = await cookies()
  cookieStore.set('super_session', JSON.stringify({ uid: user.uid, account: user.account }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 1 day
    path: '/'
  })

  return { success: true }
}

export async function superLogoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('super_session')
}

export async function getSuperSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('super_session')?.value
  if (!session) return null
  try {
    return JSON.parse(session)
  } catch {
    return null
  }
}
