import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

// La clé "anon" est publique par conception : c'est la sécurité au niveau des
// lignes (RLS) côté Supabase qui garantit que chacun ne voit que ses données.
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        flowType: "implicit",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
