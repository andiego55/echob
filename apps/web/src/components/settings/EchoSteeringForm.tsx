/**
 * EchoSteeringForm — geteilte Steuerung der Echo-Aussteuerung (Nutzer + Fachperson).
 * Preset (Modus/Ansatz) + Regler (Ton, Tiefe) + optionales Freitextfeld mit Guardrail-Hinweis.
 * Kontrolliert: Werte kommen von außen, Änderungen via onChange. Speichern macht die Seite.
 */
export interface EchoModeOption {
  key: string
  name: string
  description: string
  warning?: string // wenn gesetzt: Rückfrage vor Auswahl
}

export interface EchoSteeringValue {
  modeKey: string
  tone: number | null
  depth: number | null
  custom: string | null
}

interface Props {
  presetLabel: string
  modes: EchoModeOption[]
  value: EchoSteeringValue
  onChange: (next: EchoSteeringValue) => void
  customMax?: number
  customHint?: string
}

const TONE_LABELS = ['', 'sehr sanft', 'eher sanft', 'neutral', 'eher direkt', 'sehr direkt']
const DEPTH_LABELS = ['', 'sehr knapp', 'eher knapp', 'neutral', 'etwas tiefer', 'ausführlich']

export default function EchoSteeringForm({
  presetLabel, modes, value, onChange, customMax = 600, customHint,
}: Props) {
  const set = (patch: Partial<EchoSteeringValue>) => onChange({ ...value, ...patch })

  const pickMode = (m: EchoModeOption) => {
    if (m.key === value.modeKey) return
    if (m.warning && !window.confirm(m.warning)) return
    set({ modeKey: m.key })
  }

  return (
    <div className="space-y-8">
      {/* Preset */}
      <section>
        <h3 className="text-sm font-semibold text-navy mb-3">{presetLabel}</h3>
        <div className="space-y-2">
          {modes.map(m => {
            const active = m.key === value.modeKey
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => pickMode(m)}
                className={`w-full text-left rounded-brand border px-4 py-3 transition-colors ${
                  active
                    ? 'border-accent bg-accent/[0.04] ring-1 ring-accent/40'
                    : 'border-brand-border hover:border-accent/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                    active ? 'border-accent bg-accent' : 'border-brand-border'
                  }`} />
                  <span className="text-sm font-semibold text-navy">{m.name}</span>
                  {m.warning && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      Hinweis
                    </span>
                  )}
                </div>
                <p className="mt-1 ml-6 text-xs text-brand-muted">{m.description}</p>
                {m.warning && active && (
                  <p className="mt-1 ml-6 text-xs text-amber-700">{m.warning}</p>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Regler */}
      <section>
        <h3 className="text-sm font-semibold text-navy mb-3">Feinjustierung (optional)</h3>
        <Slider
          label="Ton" left="sanft" right="direkt"
          value={value.tone} labels={TONE_LABELS}
          onChange={v => set({ tone: v })}
        />
        <Slider
          label="Ausführlichkeit" left="knapp" right="ausführlich"
          value={value.depth} labels={DEPTH_LABELS}
          onChange={v => set({ depth: v })}
        />
      </section>

      {/* Freitext */}
      <section>
        <h3 className="text-sm font-semibold text-navy mb-1">Eigene Aussteuerung (optional)</h3>
        <p className="text-xs text-brand-muted mb-2">
          {customHint ??
            'Beschreibe in eigenen Worten, wie Echo klingen oder worauf es achten soll. ' +
            'Das passt nur Ton und Schwerpunkt an — Sicherheit, Krisenhilfe und das Diagnoseverbot bleiben immer aktiv.'}
        </p>
        <textarea
          value={value.custom ?? ''}
          onChange={e => set({ custom: e.target.value.slice(0, customMax) || null })}
          rows={3}
          maxLength={customMax}
          placeholder="z. B. „Sprich mich mit Du an und fasse dich kurz.“"
          className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <p className="mt-1 text-[11px] text-brand-muted text-right">
          {(value.custom ?? '').length}/{customMax}
        </p>
      </section>
    </div>
  )
}

function Slider({
  label, left, right, value, labels, onChange,
}: {
  label: string; left: string; right: string
  value: number | null; labels: string[]; onChange: (v: number | null) => void
}) {
  const v = value ?? 3 // 3 = neutral
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-brand-text">{label}</span>
        <span className="text-xs text-brand-muted">{labels[v]}</span>
      </div>
      <input
        type="range" min={1} max={5} step={1} value={v}
        onChange={e => {
          const n = Number(e.target.value)
          onChange(n === 3 ? null : n) // neutral → keine Aussteuerung
        }}
        className="w-full accent-accent"
      />
      <div className="flex justify-between text-[11px] text-brand-muted">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  )
}
