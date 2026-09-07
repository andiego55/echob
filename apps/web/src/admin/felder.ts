/**
 * Listenfelder im Admin-Editor: Schwerpunkte und Sprachen tippt man als Text mit
 * Kommas, gespeichert werden sie als Feld.
 *
 * **Warum das eine eigene Datei ist.** Die Umwandlung läuft bei jedem Tastendruck hin
 * und zurück. Verliert sie dabei etwas — ein Leerzeichen zu viel, ein leerer Eintrag
 * aus dem Komma am Ende —, dann verändert sich das Feld, während man nur hineinschaut.
 * Beim Speichern steht dann etwas anderes drin als das, was man gelesen hat.
 */

/** „Paare, Trauma , " → ['Paare', 'Trauma'] — leere Stücke fallen weg. */
export function listeAusText(text: string): string[] {
  return text
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
}

/** ['Paare', 'Trauma'] → „Paare, Trauma" */
export function textAusListe(liste: string[] | null | undefined): string {
  return (liste ?? []).join(', ')
}

/** Die drei Settings, die das Verzeichnis kennt. Mehr nimmt der Server nicht an. */
export const SETTINGS = [
  { wert: 'praxis', label: 'Praxis' },
  { wert: 'online', label: 'Online' },
  { wert: 'telefon', label: 'Telefon' },
] as const

/** Aus- und abwählen, ohne Doppelte und ohne Unbekanntes. */
export function settingUmschalten(aktuell: string[], wert: string): string[] {
  if (!SETTINGS.some(s => s.wert === wert)) return aktuell
  return aktuell.includes(wert) ? aktuell.filter(w => w !== wert) : [...aktuell, wert]
}

export const LINK_MARKE = '{LINK}'

/**
 * Steht im Einladungstext noch die Stelle für den Link?
 *
 * Eine Einladung ohne Link ist eine Mail, auf die niemand reagieren kann. Der Server
 * lehnt sie ebenfalls ab — aber erst nach dem Klick auf „Senden", und dann ist das Konto
 * schon angelegt. Hier fällt es auf, solange sich der Text noch ändern lässt.
 */
export function linkStelleFehlt(text: string): boolean {
  return !text.includes(LINK_MARKE)
}
