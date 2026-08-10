import { avatarBg } from '@/utils/avatars'

const SIZES = {
  xs: 'h-5 w-5 text-[11px]',
  sm: 'h-8 w-8 text-base',
  md: 'h-10 w-10 text-xl',
  lg: 'h-12 w-12 text-2xl',
  xl: 'h-16 w-16 text-3xl',
} as const

/** Rundes Avatar-Kachelchen. Zeigt das gewählte Tier-Emoji oder einen neutralen Platzhalter. */
export default function Avatar({
  value, size = 'md', className,
}: {
  value?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full leading-none ${SIZES[size]} ${
        value ? avatarBg(value) : 'border border-brand-border bg-brand-bg'
      } ${className ?? ''}`}
    >
      {value ? (
        <span aria-hidden="true">{value}</span>
      ) : (
        <svg className="h-1/2 w-1/2 text-brand-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" strokeLinecap="round" />
        </svg>
      )}
    </span>
  )
}
