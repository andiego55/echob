import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Im Browser ist die Konfiguration Pflicht. Beim Prerender/SSR-Build wird der
// Client nie aufgerufen – dort darf ein fehlendes .env den Build nicht sprengen.
if (!import.meta.env.SSR && (!supabaseUrl || !supabaseAnon)) {
  throw new Error(
    'VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY müssen in .env.local gesetzt sein.'
  )
}

// Beim SSR-Prerender wird der Client nie benutzt (öffentliche Seiten, keine
// Auth-Calls im Render). Den echten createClient dort NICHT konstruieren:
// supabase-js initialisiert sonst den Realtime-Client, der auf Node < 22 ohne
// globales WebSocket abstürzt und den Build kippt (z. B. CI mit Node 20).
export const supabase: SupabaseClient = import.meta.env.SSR
  ? ({} as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseAnon)
