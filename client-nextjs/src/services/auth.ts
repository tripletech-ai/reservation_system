import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { cache } from 'react'

export async function verifyManagerLogin(account: string, password: string) {
  if (!account || !password) {
    return { success: false, message: '請輸入帳號和密碼' }
  }

  try {
    const { data: user, error } = await supabaseAdmin
      .from('manager')
      .select('uid, name,account, logo_url, website_name, questionnaire')
      .eq('account', account)
      .eq('password', password)
      .single()

    if (error || !user) {
      return { success: false, message: '帳號或密碼錯誤' }
    }

    return {
      success: true,
      message: '登入成功',
      user: { uid: user.uid, name: user.name, account: user.account, logo_url: user.logo_url, website_name: user.website_name, questionnaire: user.questionnaire }
    }
  } catch (err) {
    console.error('Auth Service Error:', err)
    return { success: false, message: '伺服器發生錯誤' }
  }
}

// 利用 cache 緩存認證結果，頁面中多次調用效能較好
export const getAuthSession = cache(async () => {
  const cookieStore = await cookies()
  const session = cookieStore.get('manager_session')?.value

  if (!session) return null

  try {
    const userData = JSON.parse(session)
    return userData as { uid: string, name: string, account: string, logo_url: string, website_name: string, questionnaire: string }
  } catch {
    return null
  }
})
