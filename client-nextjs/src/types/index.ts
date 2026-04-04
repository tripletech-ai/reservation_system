export type Member = {
  uid: string
  name: string
  phone: string
  email: string
  status: boolean
  create_at: string
  update_at: string
  line_uid?: string
  questionnaire?: any
}

export type Manager = {
  uid: string
  name: string
  account: string
  logo_url: string
  website_name: string
  questionnaire: string
  google_calendar_id: string
}


export interface MemberListProps {
  initialMembers: Member[]
  totalCount: number
  currentPage: number
  pageSize: number
  initialSearch: string
}

export type Booking = {
  uid: string
  line_uid: string
  is_reminded_3: boolean
  is_reminded_1: boolean
  name: string
  phone: string
  email: string
  service_item: string
  booking_start_time: string
  booking_end_time: string
  is_deposit_received: boolean
  status: number
  create_at: string
  update_at: string
}

export interface BookingListProps {
  initialBookings: Booking[]
  totalCount: number
  currentPage: number
  pageSize: number
  initialSearch: string,
  session: Manager
}


export type ScheduleMenu = {
  uid: string
  manager_uid: string
  name: string
  create_at: string
  update_at: string
}

export type ScheduleTime = {
  uid: string
  schedule_menu_uid: string
  day_of_week: number // 1-7
  time_range: string // "09:00-18:00"
  max_capacity: number
  is_open: boolean
  is_open_last_booking_time: boolean
  last_booking_time: string
  create_at: string
  update_at: string
}

export type ScheduleOverride = {
  uid: string
  schedule_menu_uid: string
  override_end_time: string
  override_start_time: string
  max_capacity: number
  is_closed: boolean
  create_at: string
  update_at: string
}


export type ScheduleData = {
  menu: ScheduleMenu | null;
  times: ScheduleTime[];
  overrides: ScheduleOverride[];
};

export type ScheduleFormProps = {
  id: string
  managerUid: string
  initialData: ScheduleData
}

export type Event = {
  uid: string
  manager_uid: string
  title: string
  description: string | null
  is_phone_required: boolean
  is_email_required: boolean
  schedule_menu_uid: string // JSON array of { uid: string }
  options: string // JSON object { name: string, items: { title: string, duration: number }[] }
  booking_dynamic_url: string | null
  website_name: string | null
  create_at: string
  update_at: string
}


export type EventListProps = {
  events: Event[]
  menus: ScheduleMenu[]
  managerUid: string
  managerWebsiteName: string
}


export type EventEditFormProps = {
  id: string
  managerUid: string
  managerWebsiteName: string
  initialEvent: Event | null
  menus: ScheduleMenu[]
}



export type BookingClientProps = {
  is_member: boolean
  manager: Manager | null
  event: Event
  schedule: ScheduleData
  booking_cache: BookingCache[]
  line_uid: string | null
}


export type BookingCache = {
  uid: string;
  manager_uid: string;
  booking_start_time: string;
  booked_count: number;
  update_at: string;
  create_at: string;
}

export type GasPayload = {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  googleCalendarId: string;
  eventId?: string;
  data?: {
    name?: string;
    phone?: string;
    email?: string;
    service_item?: string;
    booking_start_time?: string;
    booking_end_time?: string;
    line_uid?: string;
    color_id?: string;
  };
}

export type LineNotifyProcedure = {
  uid: string
  name: string
  procedure: string
  create_at: string
}

// ─── 問卷題目型別 ────────────────────────────────────────────
export type QOption = {
  title: string
}
export type QItem = {
  title: string;
  options: QOption[]
}

// ─── Line Notify 問卷式填寫元件 ───────────────────────────────
export type NotifyEntry = {
  instanceId?: string;
  key: string;
  value: string,
  sample: string,
  name: string,
  uid: string,
  has_text: boolean,
  procedure_name: string,
  columns_json: string,
  more_keys?: string[],
  no_data_keys?: string[]
}

export interface ScheduleSlotProps {
  uid: string;
  time_label: string;
  time_range: string;
  time_start: string;
  max_capacity: number;
  available_capacity: number;
  start_minutes: number;
}