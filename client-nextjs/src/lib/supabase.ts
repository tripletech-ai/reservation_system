import { createClient } from '@supabase/supabase-js'
import { CONFIG_ENV } from './env'

// Use service role key for business logic behind the scenes
export const supabaseAdmin = createClient(CONFIG_ENV.supabase.url, CONFIG_ENV.supabase.serviceRoleKey)


export const SUPABASE_EDGE_FUNCTION = {
    // lineBot: 'line-bot',
    lineBotNotify: 'line-bot-notify'
}