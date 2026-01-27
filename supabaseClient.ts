
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Mengembalikan instance Supabase Client yang sudah terinisialisasi.
 * Prioritas:
 * 1. Environment Variables (Vite)
 * 2. Konfigurasi LocalStorage (User Settings)
 * 3. Null (Offline Mode)
 */
export const getSupabase = (): SupabaseClient | null => {
  const env = (import.meta as any).env;

  // 1. Cek Environment Variables
  if (env?.VITE_SUPABASE_URL && env?.VITE_SUPABASE_KEY) {
    return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY);
  }

  // 2. Cek Local Storage (jika diatur manual via Settings)
  const saved = localStorage.getItem('supabase_config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      if (config.url && config.key) {
        return createClient(config.url, config.key);
      }
    } catch (e) {
      console.error("Error parsing supabase_config from local storage", e);
    }
  }

  // 3. Mode Offline
  return null;
};
