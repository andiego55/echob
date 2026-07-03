import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Im Browser ist die Konfiguration Pflicht. Beim Prerender/SSR-Build wird der
// Client nie aufgerufen – dort darf ein fehlendes .env den Build nicht sprengen.
if (!import.meta.env.SSR && (!supabaseUrl || !supabaseAnon)) {
  throw new Error(
    'VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY müssen in .env.local gesetzt sein.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnon || 'placeholder-anon-key',
)
