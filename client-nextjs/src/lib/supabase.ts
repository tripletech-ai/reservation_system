import { createClient } from '@supabase/supabase-js'
import { CONFIG_ENV } from './env'

// Use service role key for business logic behind the scenes
// Only initialize if we have the required parameters to avoid build failure
export const supabaseAdmin = (CONFIG_ENV.supabase.url && CONFIG_ENV.supabase.serviceRoleKey) 
    ? createClient(CONFIG_ENV.supabase.url, CONFIG_ENV.supabase.serviceRoleKey)
    : null as any


export const SUPABASE_EDGE_FUNCTION = {
    // lineBot: 'line-bot',
    lineBotNotify: 'line-bot-notify'
}