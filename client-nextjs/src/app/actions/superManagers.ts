'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'

export async function getAllManagers() {
  const { data, error } = await supabaseAdmin
    .from('manager')
    .select('*')
    .order('create_at', { ascending: false })

  if (error) {
    console.error('getManagers error:', error)
    return []
  }
  return data
}

export async function upsertManager(payload: any) {
  try {
    const isEditing = !!payload.uid
    const uid = isEditing ? payload.uid : nanoid(8)
    const now = new Date().toISOString()

    const data = {
      ...payload,
      uid,
      update_at: now,
      ...(isEditing ? {} : { create_at: now })
    }

    const { error } = await supabaseAdmin
      .from('manager')
      .upsert(data)

    if (error) throw error

    revalidatePath('/superAdmin')
    return { success: true }
  } catch (err: any) {
    console.error('upsertManager error:', err)
    return { success: false, message: err.message }
  }
}

export async function deleteManager(uid: string) {
    const { error } = await supabaseAdmin
    .from('manager')
    .delete()
    .eq('uid', uid)

    if (error) {
        console.error('deleteManager error:', error)
        return { success: false, message: error.message }
    }
    revalidatePath('/superAdmin')
    return { success: true }
}
