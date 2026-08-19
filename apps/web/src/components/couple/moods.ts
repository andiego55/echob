/**
 * Die Stimmungs-Kürzel des Paarraums als Emoji.
 *
 * Die Kürzel selbst kommen vom Server (`MOOD_LABELS`), damit Vorbereitung, Check-in und
 * Echo dieselbe Sprache sprechen. Hier liegt nur das Bild dazu.
 */
export const MOOD_EMOJI: Record<string, string> = {
  ruhig: '🌤', hoffnungsvoll: '🌱', angespannt: '⚡',
  traurig: '🌧', wuetend: '🔥', erschoepft: '🌙',
}
