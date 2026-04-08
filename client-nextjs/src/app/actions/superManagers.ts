'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath, unstable_cache } from 'next/cache'
import { nanoid } from 'nanoid'
import { CACHE_TIME } from '@/constants/common'
import { ROUTES } from '@/constants/routes'

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

    revalidatePath(ROUTES.SUPER_ADMIN.HOME)


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
  revalidatePath(ROUTES.SUPER_ADMIN.HOME)
  return { success: true }
}

export const getNotifyProcedures = unstable_cache(
  async () => {
    const { data, error } = await supabaseAdmin
      .from('line_notify_procedure')
      .select('*')
      .order('create_at', { ascending: false })

    if (error) {
      console.error('getNotifyProcedures error:', error)
      return []
    }

    return data
  },
  ['line_notify_procedure'],
  {
    revalidate: CACHE_TIME,
    tags: ['line_notify_procedure']
  }
)
