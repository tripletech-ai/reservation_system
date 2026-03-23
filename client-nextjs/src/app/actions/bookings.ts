'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'

export async function submitBooking(payload: any, maxCapacityArray: number[], timeSlotInterval: number) {
  try {
    const uid = nanoid(8)
    const now = new Date().toISOString()

    const data = {
      ...payload,
      uid,
      create_at: now,
      update_at: now,
      is_cancelled: false,
      is_deposit_received: false
    }

    const { data: result, error } = await supabaseAdmin
      .rpc('submit_booking', {
        p_booking_data: data,
        p_max_capacity_array: maxCapacityArray,
        p_time_slot_interval: timeSlotInterval
      })

    if (result.booking_success) {
      revalidatePath('/bookings')
      return { success: true, uid }
    }
    else {
      return { success: false, message: result.msg }
    }
  } catch (err: any) {
    console.error('submitBooking Error:', err)
    return { success: false, message: err.message }
  }
}

export async function cancelBooking(bookingUid: string, timeSlotInterval: number, deleteType: number) {
  try {
    const { data: result, error } = await supabaseAdmin.rpc('cancel_booking', {
      _booking_uid: bookingUid,
      _time_slot_interval: timeSlotInterval,
      _delete_type: deleteType
    })

    if (error) throw error

    revalidatePath('/bookings')
    return { success: true, message: result?.msg || '取消成功' }
  } catch (err: any) {
    console.error('cancelBooking Error:', err)
    return { success: false, message: err.message }
  }
}

export async function updateBookingDepositStatus(uid: string, isDepositReceived: boolean) {
  try {
    const { error } = await supabaseAdmin
      .from('booking')
      .update({
        is_deposit_received: isDepositReceived,
        update_at: new Date().toISOString()
      })
      .eq('uid', uid)

    if (error) throw error

    revalidatePath('/bookings')
    return { success: true }
  } catch (err: any) {
    console.error('updateBookingDepositStatus Error:', err)
    return { success: false, message: err.message }
  }
}
