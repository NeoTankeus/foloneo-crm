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

// Demo mode est actif si explicitement demande (VITE_USE_DEMO_DATA=true)
// OU si Supabase n'est pas configure. Permet de coder l'UI sans devoir
// brancher la DB, et de bloquer Supabase tant que les migrations ne sont pas appliquees.
export const useDemoData =
  import.meta.env.VITE_USE_DEMO_DATA === "true" || !isSupabaseConfigured;
