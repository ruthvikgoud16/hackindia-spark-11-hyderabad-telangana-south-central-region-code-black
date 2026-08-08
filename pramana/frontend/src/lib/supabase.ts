import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  console.warn(
    "[pramana] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — Supabase auth disabled",
  );
}

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
