import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  session:  Session | null
  user:     User    | null
  loading:  boolean
  signOut:  () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  // Zuletzt bekannte user_id. Bei Nutzerwechsel/Logout muss der React-Query-
  // Cache geleert werden – sonst sähe ein neuer Login Daten und Rolle des
  // vorherigen Nutzers (z. B. Fachpersonen-Postfach nach Klient-Login).
  const prevUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    // Aktuelle Session beim Start laden
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Auf Auth-Änderungen reagieren (Login, Logout, Token-Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id ?? null
      if (prevUserId.current === undefined) {
        prevUserId.current = newUserId            // erste Initialisierung – kein Clear
      } else if (newUserId !== prevUserId.current) {
        queryClient.clear()                       // anderer oder abgemeldeter Nutzer
        prevUserId.current = newUserId
      }
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    queryClient.clear()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.')
  return ctx
}
