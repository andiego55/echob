// Avatar-Palette: 50 niedliche Tiere (Emoji). Nutzer:in und Fall wählen daraus.
// Gespeichert wird das Emoji direkt (user_profiles.avatar / onboarding_answers.avatar).

export const AVATARS: string[] = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🦉', '🦇', '🐺', '🐴', '🦄', '🐝', '🦋', '🐌', '🐞', '🐢',
  '🐍', '🦎', '🐙', '🦑', '🦀', '🐡', '🐠', '🐬', '🐳', '🦈',
  '🐊', '🐆', '🦓', '🦍', '🐘', '🦏', '🐫', '🦒', '🦔', '🦦',
]

// Sanfte Hintergrundfarben – deterministisch aus dem Emoji abgeleitet, damit jedes
// Tier eine stabile, freundliche Kachel bekommt. (Als Literale hier, damit Tailwind
// sie nicht wegpurged.)
const BGS = [
  'bg-rose-100', 'bg-amber-100', 'bg-lime-100', 'bg-emerald-100',
  'bg-sky-100', 'bg-indigo-100', 'bg-fuchsia-100', 'bg-orange-100',
]

export function avatarBg(value: string | null | undefined): string {
  if (!value) return 'bg-brand-bg'
  const code = value.codePointAt(0) ?? 0
  return BGS[code % BGS.length]
}
