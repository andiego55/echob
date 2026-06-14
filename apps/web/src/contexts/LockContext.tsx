/**
 * Diskretion & Schutz: clientseitige PIN-Sperre.
 *
 * Die PIN wird nur als SHA-256-Hash in localStorage gehalten (gerätegebunden,
 * keine Serverkomponente). Auto-Lock nach Inaktivität und beim Wechseln/Verbergen
 * des Tabs. Bewusst eine Diskretions-Sperre, kein kryptografischer Datenschutz.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const PIN_KEY = 'echob_lock_pin_hash'
const ENABLED_KEY = 'echob_lock_enabled'
const AUTO_LOCK_MS = 5 * 60 * 1000   // 5 Minuten Inaktivität

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`echob:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function isConfigured(): boolean {
  return localStorage.getItem(ENABLED_KEY) === '1' && !!localStorage.getItem(PIN_KEY)
}

interface LockContextValue {
  enabled: boolean
  locked: boolean
  enable: (pin: string) => Promise<void>
  disable: (pin: string) => Promise<boolean>
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
}

const LockContext = createContext<LockContextValue | null>(null)

export function LockProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean>(isConfigured)
  const [locked, setLocked] = useState<boolean>(isConfigured)   // beim Laden gesperrt, falls eingerichtet

  const lock = () => setLocked(true)

  // Auto-Lock nach Inaktivität
  useEffect(() => {
    if (!enabled || locked) return
    let timer = window.setTimeout(() => setLocked(true), AUTO_LOCK_MS)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setLocked(true), AUTO_LOCK_MS)
    }
    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [enabled, locked])

  // Beim Verbergen/Wechseln des Tabs sofort sperren
  useEffect(() => {
    if (!enabled) return
    const onVisibility = () => { if (document.visibilityState === 'hidden') setLocked(true) }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [enabled])

  const enable = async (pin: string) => {
    localStorage.setItem(PIN_KEY, await hashPin(pin))
    localStorage.setItem(ENABLED_KEY, '1')
    setEnabled(true)
    setLocked(false)
  }

  const disable = async (pin: string) => {
    if (await hashPin(pin) !== localStorage.getItem(PIN_KEY)) return false
    localStorage.removeItem(PIN_KEY)
    localStorage.removeItem(ENABLED_KEY)
    setEnabled(false)
    setLocked(false)
    return true
  }

  const unlock = async (pin: string) => {
    if (await hashPin(pin) === localStorage.getItem(PIN_KEY)) {
      setLocked(false)
      return true
    }
    return false
  }

  return (
    <LockContext.Provider value={{ enabled, locked, enable, disable, unlock, lock }}>
      {children}
    </LockContext.Provider>
  )
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext)
  if (!ctx) throw new Error('useLock must be used within a LockProvider')
  return ctx
}
