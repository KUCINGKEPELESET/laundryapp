import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_SUPABASE') || supabaseAnonKey.includes('YOUR_SUPABASE')) {
    console.error("SETUP REQUIRED: Check .env");
}

// Custom Storage Adapter for Capacitor
const CapacitorStorage = {
    getItem: async (key) => {
        // Native Fallback
        const { value } = await Preferences.get({ key });
        return value;
    },
    setItem: async (key, value) => {
        await Preferences.set({ key, value });
    },
    removeItem: async (key) => {
        await Preferences.remove({ key });
    },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: CapacitorStorage, // <--- KEY FIX FOR PERSISTENT LOGIN
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})
