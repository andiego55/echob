import { Link } from 'react-router-dom'
import type { ContentMeta, CtaPosition } from '@/content/types'

/**
 * Der Übergang von Artikel zu Echo – als *Fortsetzung* des Lesens, nicht als
 * Werbeunterbrechung. Nutzt die vorsichtige, nicht-diagnostische Einstiegsfrage
 * der Seite (echo.opening_question). Die Formulierung variiert je Position.
 *
 * PR2: der primäre CTA verlinkt vorerst in die App (Auth-Gate). Der geführte
 * /reflektieren-Flow mit Fall-Auswahl + Echo-Seed folgt in PR3.
 */
const HEADINGS: Record<CtaPosition, string> = {
  'after-intro': 'Kennst du das aus deiner eigenen Situation?',
  'after-reflection': 'Beziehe das jetzt auf deinen eigenen Fall',
  end: 'Von hier aus weiter – mit deiner eigenen Situation',
}

export default function EchoReflectionCard({
  meta,
  position = 'end',
}: {
  meta: ContentMeta
  position?: CtaPosition
}) {
  const reflectHref = `/app?thema=${meta.slug}` // PR3 → /reflektieren?topic=…&source=…

  return (
    <aside className="not-prose my-8 rounded-brand border border-accent/25 bg-accent/[0.04] px-6 py-6">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-accent">
        Mit Echo reflektieren
      </span>
      <h3 className="text-base font-bold text-navy">{HEADINGS[position]}</h3>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">{meta.echo.opening_question}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to={reflectHref} className="btn-primary !px-5 !py-2.5 !text-sm">
          Auf meine Situation beziehen
        </Link>
        <Link to="/auth" className="text-sm font-medium text-accent hover:underline">
          Noch keinen Fall? Kostenlos anlegen
        </Link>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-brand-muted/80">
        Echo arbeitet nur mit deinem eigenen, ausdrücklich gewählten Fall – privat und verschlüsselt.
        Es stellt keine Diagnose.
      </p>
    </aside>
  )
}
