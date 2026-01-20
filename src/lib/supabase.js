import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://qnxcwjezlbymkkpzptnw.supabase.co'
export const supabaseAnonKey = 'sb_publishable_n1k_PjzrpTRUhzIFfLfhew_c0-EQkNl'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
