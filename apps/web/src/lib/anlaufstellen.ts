/**
 * Die Nummern, die immer gelten.
 *
 * **Warum das eine eigene Datei ist.** Der Krisenplan zeigt im Ernstfall zuerst die
 * eigenen Menschen — und darunter diese hier, für den Fall, dass niemand rangeht oder
 * niemand eingetragen ist. Genau an dieser Stelle darf keine Nummer fehlen und keine
 * falsch sein. Eine Zeichenkette, die im JSX einer Seite steht, wird beim nächsten Umbau
 * mit umgeschrieben; eine benannte Liste nicht.
 *
 * **Das Backend hat dieselben Zahlen** (`safety_service.CRISIS_RESOURCES`), und das ist
 * kein Versehen: Dort gehen sie in Echos Antworten, hier auf den Bildschirm. Zwei
 * Laufzeiten, zwei Quellen — aber beide benannt, sodass eine Änderung an zwei Stellen
 * gesucht und gefunden wird statt an fünfzehn.
 *
 * Diese Liste ist kurz gehalten. Im Notfall liest niemand zwölf Einträge; er wählt den
 * ersten, der passt.
 */

export interface Anlaufstelle {
  name: string
  /** So, wie man sie liest. Zum Wählen dient `wahl`. */
  nummer: string
  /** Ohne Leerzeichen, für `tel:` — oder null, wenn sich das nicht wählen lässt. */
  wahl: string | null
  hinweis: string
}

export const ANLAUFSTELLEN: Anlaufstelle[] = [
  {
    name: 'Notruf',
    nummer: '112',
    wahl: '112',
    hinweis: 'bei akuter Gefahr, rund um die Uhr',
  },
  {
    name: 'Telefonseelsorge',
    nummer: '0800 111 0 111',
    wahl: '08001110111',
    hinweis: 'kostenlos, anonym, rund um die Uhr',
  },
  {
    name: 'Hilfetelefon Gewalt gegen Frauen',
    nummer: '116 016',
    wahl: '116016',
    hinweis: 'kostenlos, rund um die Uhr, mehrsprachig',
  },
  {
    name: 'Hilfetelefon Gewalt an Männern',
    nummer: '0800 123 9900',
    wahl: '08001239900',
    hinweis: 'kostenlos',
  },
]
