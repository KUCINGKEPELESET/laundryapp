import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qnxcwjezlbymkkpzptnw.supabase.co'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_n1k_PjzrpTRUhzIFfLfhew_c0-EQkNl'

// Custom Storage Adapter for Capacitor
const CapacitorStorage = {
    getItem: async (key) => {
        const { value } = await Preferences.get({ key })
        return value
    },
    setItem: async (key, value) => {
        await Preferences.set({ key, value })
    },
    removeItem: async (key) => {
        await Preferences.remove({ key })
    },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: CapacitorStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})
