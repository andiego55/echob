/**
 * InstituteTabs – schlichte Unterstrich-Tabs zum Bündeln verwandter Ansichten auf einer Seite
 * (z. B. Studierende: Status/Verwalten, Lernmodule: Meine Module/Marktplatz).
 */
export interface TabDef {
  key: string
  label: string
  badge?: number
}

export default function InstituteTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex gap-1 border-b border-brand-border">
      {tabs.map((t) => {
        const on = active === t.key
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              on ? 'border-accent text-navy' : 'border-transparent text-brand-muted hover:text-navy'
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-800">{t.badge}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
