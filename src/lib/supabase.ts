import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export const useDemoData = import.meta.env.VITE_USE_DEMO_DATA !== "false" && !isSupabaseConfigured;
