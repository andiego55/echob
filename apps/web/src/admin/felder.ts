/**
 * Kleine Regeln des Admin-Formulars, die außerhalb von React stehen sollen.
 *
 * Hier standen einmal `listeAusText`/`textAusListe`, die ein Komma-Textfeld in eine Liste
 * und zurück rechneten. Sie sind weg, und mit ihnen ein Fehler, der nur beim Benutzen
 * auffiel: Wer „Paare," tippte, bekam die Liste `['Paare']` und daraus wieder den Text
 * „Paare" — das Komma verschwand unter den Fingern. Listenfelder benutzen jetzt
 * `components/directory/TagInput`, das seinen Entwurfstext selbst behält.
 */

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
