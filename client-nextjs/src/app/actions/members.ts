'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { ROUTES } from '@/constants/routes'

export async function registerMember(payload: {
  manager_uid: string
  name: string
  line_uid: string
  phone: string
  email: string
  questionnaire: string
}) {
  try {
    const now = new Date().toISOString()
    const uid = nanoid(8)

    const data = {
      ...payload,
      uid,
      status: true,
      create_at: now,
      update_at: now
    }


    const { data: result } = await supabaseAdmin
      .from('member').select('*')
      .eq('phone', payload.phone)
      .eq('manager_uid', payload.manager_uid).single()

    if (result) {
      return { success: false, message: '此電話已註冊' }
    }

    const { error } = await supabaseAdmin
      .from('member')
      .insert(data)

    if (error) {
      // Check for unique constraint on phone if necessary
      throw error
    }

    // revalidatePath(ROUTES.ADMIN.MEMBERS)
    return { success: true, uid }
  } catch (err: any) {
    console.error('registerMember Error:', err)
    return { success: false, message: err.message }
  }
}

export async function updateMember(payload: {
  uid: string
  status: boolean
  name: string
  phone: string
  email: string
}) {
  try {
    const now = new Date().toISOString()
    const { uid, status, name, phone, email } = payload

    const { error } = await supabaseAdmin
      .from('member')
      .update({
        status,
        name,
        phone,
        email,
        update_at: now
      })
      .eq('uid', uid)

    if (error) {
      throw error
    }

    revalidatePath(ROUTES.ADMIN.MEMBERS)
    return { success: true }
  } catch (err: any) {
    console.error('updateMember Error:', err)
    return { success: false, message: err.message }
  }
}
