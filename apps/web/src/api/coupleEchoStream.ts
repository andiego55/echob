/**
 * Die Antwort des Paar-Begleiters lesen, während sie entsteht.
 *
 * **Warum gerade hier.** Der Faden „Nach einem Streit" wird von jemandem benutzt, der
 * gerade aufgewühlt ist. Zehn Sekunden Tippindikator sind da keine Wartezeit, sondern eine
 * Stille — und Stille nach dem Absenden fühlt sich an wie Ignoriertwerden.
 *
 * Die Mechanik liegt in `lib/sseLeser`, gemeinsam mit dem Fall-Echo. Hier steht nur, was
 * diesen Strom ausmacht: seine Adresse und sein Ergebnistyp. Der Paarbereich hängt damit
 * nicht am Fall-Bereich, sondern beide an derselben Leitung.
 */
import type { CoupleEchoConversation, CoupleThreadKind } from '@/api/coupleCompanion'
import { stromAnfordern, stromLesen, type Einstufung } from '@/lib/sseLeser'

export { StreamNichtMoeglich } from '@/lib/sseLeser'

/**
 * Schickt einen Beitrag und ruft `onStueck` für jedes Textstück.
 *
 * Zurück kommt das vollständige Gespräch mit echten Ids — dieselbe Nutzlast wie bei
 * `coupleCompanionApi.send`, damit die Oberfläche den vorläufigen Text einfach durch die
 * gespeicherte Nachricht ersetzen kann.
 *
 * Wirft `StreamNichtMoeglich`, wenn dieser Weg nicht geht; die Aufrufstelle nimmt dann
 * `coupleCompanionApi.send`.
 */
export async function begleiterStreamen(
  coupleId: string,
  kind: CoupleThreadKind,
  inhalt: string,
  onStueck: (text: string) => void,
  onEinstufung?: (safety: Einstufung) => void,
  signal?: AbortSignal,
): Promise<CoupleEchoConversation> {
  const antwort = await stromAnfordern(
    `/couple/links/${coupleId}/echo/stream?kind=${encodeURIComponent(kind)}`,
    { content: inhalt },
    signal,
  )
  return stromLesen<CoupleEchoConversation>(antwort, onStueck, onEinstufung)
}
