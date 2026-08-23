/**
 * Die Stimmungs-Kürzel des Paarraums als Emoji.
 *
 * Die Kürzel selbst kommen vom Server (`MOOD_LABELS`), damit Vorbereitung, Check-in und
 * Echo dieselbe Sprache sprechen. Hier liegt nur das Bild dazu.
 */
export const MOOD_EMOJI: Record<string, string> = {
  // Reihenfolge wie in MOOD_LABELS: von gesammelt über angespannt zu schwer.
  ruhig: '🌤', hoffnungsvoll: '🌱', verbunden: '🫂', dankbar: '🌻',
  erleichtert: '😌', unsicher: '🧭', angespannt: '⚡', gereizt: '🌡',
  ueberfordert: '🌊', erschoepft: '🌙', traurig: '🌧', einsam: '🌫',
  enttaeuscht: '🍂', verletzt: '💔', wuetend: '🔥', leer: '🪫',
}
