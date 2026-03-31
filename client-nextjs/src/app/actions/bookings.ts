'use server'

import { BOOKING_STATUS } from '@/constants/common'
import { ROUTES } from '@/constants/routes'
import { GoogleCalendarService } from '@/lib/google_calendar'
import { supabaseAdmin, SUPABASE_EDGE_FUNCTION } from '@/lib/supabase'
import { Manager } from '@/types'
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
      status: BOOKING_STATUS.BOOKING,
      is_deposit_received: false
    }

    const { data: result, error } = await supabaseAdmin
      .rpc('submit_booking', {
        p_booking_data: data,
        p_max_capacity_array: maxCapacityArray,
        p_time_slot_interval: timeSlotInterval
      })


    if (error) throw error

    if (!result.booking_success) {
      return { success: false, message: result.msg }
    }


    if (result.google_calendar_id) {

      const google_calendar_event_id = await GoogleCalendarService.sync({
        action: 'CREATE',
        googleCalendarId: result.google_calendar_id,
        data: {
          name: payload.name,
          phone: payload.phone || '',
          email: payload.email || '',
          service_item: payload.service_item,
          booking_start_time: payload.booking_start_time,
          booking_end_time: payload.booking_end_time,
          line_uid: payload.line_uid || result.line_uid
        }
      })

      await supabaseAdmin.from('booking').update({
        google_calendar_event_id: google_calendar_event_id
      }).eq('uid', result.booking_uid)
    }

    if (result.line_uid && result.line_channel_access_token) {
      await supabaseAdmin.functions.invoke(SUPABASE_EDGE_FUNCTION.lineBotNotify, {
        body: {
          name: payload.name,
          phone: payload.phone || '',
          email: payload.email || '',
          service_item: payload.service_item,
          booking_start_time: payload.booking_start_time,
          booking_end_time: payload.booking_end_time,
          line_uid: payload.line_uid || result.line_uid,
          manager_uid: payload.manager_uid,
          action: 'BOOKING',
          displayTime: `${payload.booking_start_time} - ${payload.booking_end_time.slice(-5)}`
        },
      })
    }

    revalidatePath('/bookings')
    return { success: true, uid }



  } catch (err: any) {
    console.error('submitBooking Error:', err)
    return { success: false, message: err.message }
  }
}


export async function cancelBooking(bookingUid: string, session: Manager, timeSlotInterval: number, deleteType: number) {
  try {
    const { data: result, error } = await supabaseAdmin.rpc('cancel_booking', {
      _booking_uid: bookingUid,
      _time_slot_interval: timeSlotInterval,
      _delete_type: deleteType
    })

    if (error || !result.success) {
      return { success: false, message: result.error || error }
    }

    if (result.data?.google_calendar_event_id) {


      await GoogleCalendarService.sync({
        action: 'DELETE',
        googleCalendarId: session.google_calendar_id,
        eventId: result.data.google_calendar_event_id
      })
    }

    revalidatePath(ROUTES.ADMIN.BOOKINGS)
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

    revalidatePath(ROUTES.ADMIN.BOOKINGS)
    return { success: true }
  } catch (err: any) {
    console.error('updateBookingDepositStatus Error:', err)
    return { success: false, message: err.message }
  }
}
