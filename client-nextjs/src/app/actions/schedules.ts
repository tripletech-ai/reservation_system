'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function saveScheduleConfig(payload: {
  menu: { uid: string; manager_uid: string; name: string },
  times: any[]
}) {
  try {
    const { error } = await supabaseAdmin.rpc('save_schedule_config', {
      config: payload
    })

    if (error) throw error

    revalidatePath('/schedules')
    return { success: true }
  } catch (err: any) {
    console.error('saveScheduleConfig RPC Error:', err)
    return { success: false, message: err.message }
  }
}

export async function saveOverride(data: any) {
  try {
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('schedule_override')
      .upsert({ ...data, update_at: now })

    if (error) throw error
    revalidatePath('/schedules/[id]', 'page')
    return { success: true }
  } catch (err: any) {
    console.error('saveOverride Error:', err)
    return { success: false, message: err.message }
  }
}

export async function deleteOverride(uid: string) {
  try {
    const { error } = await supabaseAdmin
      .from('schedule_override')
      .delete()
      .eq('uid', uid)
    if (error) throw error
    revalidatePath('/schedules/[id]', 'page')
    return { success: true }
  } catch (err: any) {
    console.error('deleteOverride Error:', err)
    return { success: false, message: err.message }
  }
}

export async function createScheduleMenu(managerUid: string) {
  try {
    const { nanoid } = await import('nanoid')
    const uid = nanoid(8)
    const { data, error } = await supabaseAdmin
      .from('schedule_menu')
      .insert({
        uid,
        manager_uid: managerUid,
        name: '未命名模板',
        create_at: new Date().toISOString(),
        update_at: new Date().toISOString()
      })
      .select('uid')
      .single()

    if (error) throw error
    revalidatePath('/schedules')
    return { success: true, uid }
  } catch (err: any) {
    console.error('createScheduleMenu Error:', err)
    return { success: false, message: err.message }
  }
}

export async function deleteScheduleMenu(uid: string) {
  try {
    const { data, error } = await supabaseAdmin.rpc('delete_schedule', {
      menu_uid: uid
    })
    if (data.success) {
      revalidatePath('/schedules')
      return { success: true }
    } else {
      return { success: false, message: data.message }
    }
  } catch (err: any) {
    console.error('deleteScheduleMenu Error:', err)
    return { success: false, message: err.message }
  }
}
