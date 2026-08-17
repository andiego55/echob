/**
 * Läuft die App gerade in einer Store-Hülle (Android-TWA) statt im Browser?
 *
 * Wichtig fürs Bezahlen: Verkauft eine App digitale Abos, die in ihr genutzt werden,
 * verlangen die Stores grundsätzlich ihre eigene Bezahlung. Solange wir das nicht
 * anbinden, zeigen wir in der Hülle weder Preise noch Kaufknöpfe und lotsen auch nicht
 * nach außen — abgeschlossen wird auf der Website.
 *
 * Erkennung über den Referrer, den Chrome für eine Trusted Web Activity setzt
 * (`android-app://<paket>`), plus die von Bubblewrap gesetzte Startadresse. Beides ist
 * bewusst konservativ: Im Zweifel gilt „Browser“, damit im Web nichts verschwindet.
 */
const STORE_FLAG = 'echob.store_shell'

function detect(): boolean {
  if (typeof window === 'undefined') return false          // SSR/Prerender
  try {
    if (document.referrer.startsWith('android-app://')) return true
    if (new URLSearchParams(window.location.search).get('shell') === 'store') return true
    return sessionStorage.getItem(STORE_FLAG) === '1'
  } catch {
    return false
  }
}

let cached: boolean | null = null

/** True, wenn wir in der Android-App laufen. Ergebnis wird für die Sitzung gemerkt. */
export function isInStoreApp(): boolean {
  if (cached === null) {
    cached = detect()
    // Der Referrer steht nur beim ersten Aufruf zur Verfügung – danach merken,
    // sonst gilt ab der zweiten Seite wieder „Browser“.
    if (cached) {
      try { sessionStorage.setItem(STORE_FLAG, '1') } catch { /* egal */ }
    }
  }
  return cached
}

/** Darf hier ein Kauf angeboten werden? */
export function mayOfferPurchase(): boolean {
  return !isInStoreApp()
}
