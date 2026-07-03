import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyHead } from '@/lib/seo'

/**
 * Setzt Titel/Description/Canonical/OG je Route (Client-Rendering).
 * Rendert nichts; lebt einmalig im App-Baum innerhalb des Routers.
 */
export default function RouteSeo() {
  const { pathname } = useLocation()
  useEffect(() => {
    applyHead(pathname)
  }, [pathname])
  return null
}
