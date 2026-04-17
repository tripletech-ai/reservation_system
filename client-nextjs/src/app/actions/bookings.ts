'use server'

import { BOOKING_STATUS, LINE_NOTIFY_ACTION } from '@/constants/common'
import { ROUTES } from '@/constants/routes'
import { GOOGLE_CALENDAR_COLOR_ID, GoogleCalendarService } from '@/lib/google_calendar'
import { supabaseAdmin, SUPABASE_EDGE_FUNCTION } from '@/lib/supabase'
import { Booking, Manager } from '@/types'
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
      status: BOOKING_STATUS.REVIEW,
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

    console.log("result", payload)
    if (result.google_calendar_id) {

      (async () => {
        try {
          // 內部的 await 會確保這兩步是「自己等待自己」按順序執行的
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
              service_computed_duration: payload.service_computed_duration,
              line_uid: payload.line_uid || result.line_uid,
              color_id: GOOGLE_CALENDAR_COLOR_ID.GRAY.toString()
            }
          });

          await supabaseAdmin.from('booking').update({
            google_calendar_event_id: google_calendar_event_id
          }).eq('uid', result.booking_uid);

          console.log('背景同步完成');
        } catch (error) {
          // 因為主流程不等待，這裡的錯誤必須在內部捕捉，否則會導致 UnhandledPromiseRejection
          console.error('背景同步失敗:', error);
        }
      })();
    }

    if (result.line_uid) {
      supabaseAdmin.functions.invoke(SUPABASE_EDGE_FUNCTION.lineBotNotify, {
        body: {
          name: payload.name,
          phone: payload.phone || '',
          email: payload.email || '',
          service_item: payload.service_item,
          booking_start_time: payload.booking_start_time,
          booking_end_time: payload.booking_end_time,
          line_uid: payload.line_uid || result.line_uid,
          service_computed_duration: payload.service_computed_duration,
          manager_uid: payload.manager_uid,
          action: LINE_NOTIFY_ACTION.BOOKING,
          displayTime: `${payload.booking_start_time} - ${payload.booking_end_time.slice(-5)}`
        },
      })
    }

    revalidatePath(ROUTES.ADMIN.BOOKINGS)
    return { success: true, uid }

  } catch (err: any) {
    console.error('submitBooking Error:', err)
    return { success: false, message: err.message }
  }
}


export async function cancelBooking(booking: Booking, session: Manager, timeSlotInterval: number, deleteType: number) {
  try {
    const { data: result, error } = await supabaseAdmin.rpc('cancel_booking', {
      _booking_uid: booking.uid,
      _time_slot_interval: timeSlotInterval,
      _manager_uid: session.uid,
      _delete_type: deleteType
    })

    if (error || !result.success) {
      return { success: false, message: result.error || error }
    }

    if (result.data?.google_calendar_event_id && result.data.google_calendar_id) {
      GoogleCalendarService.sync({
        action: 'DELETE',
        googleCalendarId: result.data.google_calendar_id,
        eventId: result.data.google_calendar_event_id
      })
    }

    if (booking.line_uid) {
      supabaseAdmin.functions.invoke(SUPABASE_EDGE_FUNCTION.lineBotNotify, {
        body: {
          name: booking.name,
          service_item: booking.service_item,
          booking_start_time: booking.booking_start_time,
          booking_end_time: booking.booking_end_time,
          line_uid: booking.line_uid || result.line_uid,
          manager_uid: session.uid,
          action: LINE_NOTIFY_ACTION.CANCEL,
          flexType: BOOKING_STATUS.CANCELLED,
          displayTime: `${booking.booking_start_time} - ${booking.booking_end_time.slice(-5)}`
        },
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

export async function updateBookingStatus(booking: Booking, session: Manager, status: number) {
  try {

    const { data: result, error } = await supabaseAdmin.rpc('update_booking_status', {
      _booking_uid: booking.uid,
      _new_status: status,
    })

    if (error || !result.success) {
      return { success: false, message: result.error || error }
    }



    if (result.data?.google_calendar_event_id && result.data.google_calendar_id) {
      GoogleCalendarService.sync({
        action: 'UPDATE',
        googleCalendarId: result.data.google_calendar_id,
        eventId: result.data.google_calendar_event_id,
        data: {
          color_id: status == BOOKING_STATUS.REVIEW ? GOOGLE_CALENDAR_COLOR_ID.GRAY.toString() : GOOGLE_CALENDAR_COLOR_ID.PURPLE.toString()
        }
      }).catch(err => {
        console.error("背景同步日曆失敗:", err);
      });
    }
    if (booking.line_uid && result.data?.new_status == BOOKING_STATUS.BOOKING_SUCCESS) {
      supabaseAdmin.functions.invoke(SUPABASE_EDGE_FUNCTION.lineBotNotify, {
        body: {
          name: booking.name,
          service_item: booking.service_item,
          booking_start_time: booking.booking_start_time,
          booking_end_time: booking.booking_end_time,
          line_uid: booking.line_uid || result.line_uid,
          manager_uid: session.uid,
          service_computed_duration: booking.service_computed_duration,
          action: LINE_NOTIFY_ACTION.BOOKING_SUCCESS,
          displayTime: `${booking.booking_start_time} - ${booking.booking_end_time.slice(-5)}`
        },
      })
    }

    revalidatePath(ROUTES.ADMIN.BOOKINGS)
    return { success: true }
  } catch (err: any) {
    console.error('updateBookingStatus Error:', err)
    return { success: false, message: err.message }
  }
}
