import { BOOKING_STATUS } from '@/constants/common'
import { supabaseAdmin } from '@/lib/supabase'
import { Member, Booking, ScheduleMenu, ScheduleTime, ScheduleOverride, Event, Manager, BookingCache } from '@/types'
// ... (some code)
export async function getScheduleMenus(managerUid: string): Promise<ScheduleMenu[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('schedule_menu')
      .select('*')
      .eq('manager_uid', managerUid)
      .order('create_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('getScheduleMenus Error:', err)
    return []
  }
}

export async function getScheduleDetails(menuUid: string): Promise<{
  menu: ScheduleMenu | null;
  times: ScheduleTime[];
  overrides: ScheduleOverride[];
}> {
  try {
    // 呼叫 SQL Function
    const { data, error } = await supabaseAdmin.rpc('get_schedule', {
      meun_uid: menuUid
    });
    if (error) throw error;

    // data 的結構已經由 SQL 定義好：{ menu, times, overrides }
    return {
      menu: data.menu as ScheduleMenu,
      times: (data.times || []) as ScheduleTime[],
      overrides: (data.overrides || []) as ScheduleOverride[]
    };

  } catch (err) {
    console.error('getScheduleDetails Error:', err);
    // 保持回傳結構一致，避免前端 Crash
    return { menu: null, times: [], overrides: [] };
  }
}

export interface MemberFilter {
  searchTerm?: string
  page?: number
  pageSize?: number
}

export async function getMembers(managerUid: string, filter: MemberFilter = {}): Promise<{
  members: Member[],
  totalCount: number,
  page: number,
  pageSize: number
}> {
  const { searchTerm, page = 1, pageSize = 10 } = filter

  try {
    let query = supabaseAdmin
      .from('member')
      .select('*', { count: 'exact' })
      .eq('manager_uid', managerUid)
      .order('create_at', { ascending: false })

    if (searchTerm) {
      // 搜尋姓名、電話或 Email
      query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('create_at', { ascending: false })
      .range(from, to)

    if (error) throw error
    return {
      members: data || [],
      totalCount: count || 0,
      page,
      pageSize
    }
  } catch (err) {
    console.error('getMembers Error:', err)
    return { members: [], totalCount: 0, page, pageSize }
  }
}

export interface BookingFilter {
  searchTerm?: string
  page?: number
  pageSize?: number
}

export async function getBookings(managerUid: string, filter: BookingFilter = {}): Promise<{
  bookings: Booking[],
  totalCount: number,
  page: number,
  pageSize: number
}> {
  const { searchTerm, page = 1, pageSize = 10 } = filter

  try {
    let query = supabaseAdmin
      .from('booking')
      .select('*', { count: 'exact' })
      .eq('manager_uid', managerUid)

    if (searchTerm) {
      // 搜尋會員姓名、電話或服務名稱
      query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,service_item.ilike.%${searchTerm}%`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('status', { ascending: true })
      .order('booking_start_time', { ascending: true })
      .range(from, to)

    if (error) throw error
    return {
      bookings: data || [],
      totalCount: count || 0,
      page,
      pageSize
    }
  } catch (err) {
    console.error('getBookings Error:', err)
    return { bookings: [], totalCount: 0, page, pageSize }
  }
}

export async function getEvents(managerUid: string) {
  const { data, error } = await supabaseAdmin
    .from('event')
    .select('*')
    .eq('manager_uid', managerUid)
    .order('create_at', { ascending: false })

  if (error) throw error
  return data as Event[]
}

export async function getEventDetails(uid: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('event')
      .select('*')
      .eq('uid', uid)
      .single()

    if (error) throw error

    return {
      event: data as Event,
    }

  } catch (err) {
    console.error('getEventDetails Error:', err)
    return null
  }
}

export async function getBookingInfo(
  websiteName: string,
  dynamicUrl: string,
  scheduleMenuUid?: string | null,
  lineUid?: string | null
) {
  try {
    // 💡 建議：解碼 websiteName，避免資料庫比對字串不符（針對 %E6%B8%AC... 這種情況）
    const decodedWebsiteName = decodeURIComponent(websiteName);
    const decodeddynamicUrl = decodeURIComponent(dynamicUrl);

    const { data, error } = await supabaseAdmin.rpc('check_member_and_get_event_schedule_info', {
      p_line_uid: lineUid || null,
      p_booking_dynamic_url: decodeddynamicUrl,
      p_website_name: decodedWebsiteName,
      p_schedule_menu_uid: scheduleMenuUid || null
    });

    if (error) throw error;

    const rawResult = data?.[0] as { result: any } | undefined;
    const result = rawResult?.result;

    if (!result || !result.success) {
      console.warn('getBookingInfo: No event found or success is false');
      return null;
    }

    return {
      success: true,
      is_member: !!result.is_member, // 強制轉為 boolean
      event: result.event as Event,
      manager: result.manager as Manager | null, // manager 可能為空
      schedule: {
        menu: null, // 如果需要 menu 資訊，應在 SQL 補上
        times: (result.schedule_time || []) as ScheduleTime[],
        overrides: (result.schedule_override || []) as ScheduleOverride[]
      },
      // 💡 根據你最新的 SQL，這裡現在是完整的物件陣列
      booking_cache: (result.booking_cache || []) as BookingCache[]
    };
  } catch (err) {
    console.error('getBookingInfo RPC Error:', err);
    return null;
  }
}

