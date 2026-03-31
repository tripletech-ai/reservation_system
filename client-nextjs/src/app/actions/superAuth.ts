'use server'

import { MANAGER_LEVEL } from '@/constants/common'
import { comparePassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Manager } from '@/types'
import { cookies } from 'next/headers'

export async function loginAction(formData: FormData, type: number) {
  const account = formData.get('account') as string
  const password = formData.get('password') as string

  // Simple check for super admin.
  // In production, we should check a specific table or a column like is_super_admin.
  // For now, let's assume account 'admin' is the super admin.

  const { data: user, error } = await supabaseAdmin
    .from('manager')
    .select('*')
    .eq('account', account)
    .gte('level', type)
    .single()


  if (error || !user) {
    return { success: false, message: '管理員帳號錯誤' }
  }

  const isPasswordValid = await comparePassword(password, user.password)
  if (!isPasswordValid) {
    return { success: false, message: '管理員密碼錯誤' }
  }
  user.password = ''
  const cookieStore = await cookies()
  cookieStore.set(cacheKey(type), JSON.stringify({ uid: user.uid, account: user.account, website_name: user.website_name, logo_url: user.logo_url, google_calendar_id: user.google_calendar_id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 1 day
    path: '/'
  })

  return {
    success: true,
    message: '登入成功',
    user: user as Manager
  }
}

export async function logoutAction(type: number) {
  const cookieStore = await cookies()
  cookieStore.delete(cacheKey(type))
}

export async function getSession(type: number) {
  const cookieStore = await cookies()
  const session = cookieStore.get(cacheKey(type))?.value
  if (!session) return null
  try {
    return JSON.parse(session)
  } catch {
    return null
  }
}


const cacheKey = (type: number) => {
  return type == MANAGER_LEVEL.SUPER ? 'super_session' : 'manager_session'
}