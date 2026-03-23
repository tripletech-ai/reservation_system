'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'

export async function saveEvent(payload: any) {
  try {
    const isNew = !payload.uid
    const now = new Date().toISOString()
    const uid = payload.uid || nanoid(8)

    const data = {
      ...payload,
      uid,
      update_at: now
    }

    if (isNew) {
      data.create_at = now
    }

    const { error } = await supabaseAdmin
      .from('event')
      .upsert(data)

    if (error) throw error

    revalidatePath('/events')
    return { success: true, uid }
  } catch (err: any) {
    console.error('saveEvent Error:', err)
    return { success: false, message: err.message }
  }
}

export async function deleteEvent(uid: string) {
  try {
    const { error } = await supabaseAdmin
      .from('event')
      .delete()
      .eq('uid', uid)

    if (error) throw error

    revalidatePath('/events')
    return { success: true }
  } catch (err: any) {
    console.error('deleteEvent Error:', err)
    return { success: false, message: err.message }
  }
}
