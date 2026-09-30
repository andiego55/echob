/**
 * Der Abspieler — und er ist der Grund, warum die Folge in Kapitel zerfällt.
 *
 * **Zusammengefügt wird hier, nicht auf dem Server.** Jedes Kapitel ist eine eigene Datei;
 * der Abspieler hängt sie aneinander, indem er am Ende des einen das nächste lädt. Kein
 * Zusammenschneiden auf dem Server, keine Audio-Bibliothek, keine ffmpeg-Abhängigkeit im
 * Container — und als Zugabe ein Kapitelsprung, den man sonst extra bauen müsste.
 *
 * **Die Tonspuren kommen durch den API-Client, nicht über eine Adresse.** Ein `<audio src>`
 * kann sich nicht anmelden. Also holt der Abspieler die Bytes und macht daraus eine
 * Objekt-URL. Umständlicher als ein Link, und genau darum geht es: Eine Aufnahme über eine
 * Beziehung ist nichts, wovon eine öffentliche Adresse herumliegen soll.
 *
 * **Geladen wird, was gebraucht wird.** Zwanzig Minuten am Stück zu holen hieße, vor dem
 * ersten Ton zwei Megabyte zu warten. Das erste Kapitel kommt sofort, die übrigen, wenn man
 * dort ankommt — und einmal geholt, bleiben sie für diese Sitzung liegen.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { podcastApi, type PodcastKapitel } from '@/api/podcast'
import { zeit } from '@/lib/podcast'

// `zeit` wohnt in lib/podcast.ts: Eine Formatierung ist eine reine Funktion, und nur dort
// ist sie prüfbar — der Testaufbau dieses Projekts rendert bewusst nichts.
export { zeit }

export default function Abspieler({ caseId, podcastId, kapitel }: {
  caseId: string
  podcastId: string
  kapitel: PodcastKapitel[]
}) {
  const [index, setIndex] = useState(0)
  const [laeuft, setLaeuft] = useState(false)
  const [holt, setHolt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [stand, setStand] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Einmal geholte Kapitel bleiben liegen — für diese Sitzung, nicht darüber hinaus.
  const urls = useRef<Map<string, string>>(new Map())
  // Beim Verlassen der Seite alles freigeben: Objekt-URLs halten die Bytes im Speicher,
  // bis jemand sie widerruft.
  useEffect(() => {
    const gehalten = urls.current
    return () => { gehalten.forEach(u => URL.revokeObjectURL(u)) }
  }, [])

  const spielbar = kapitel.filter(k => k.gesprochen)
  const aktuell = spielbar[index]

  const quelleHolen = useCallback(async (k: PodcastKapitel) => {
    const schon = urls.current.get(k.id)
    if (schon) return schon
    const blob = await podcastApi.tonHolen(caseId, podcastId, k.id)
    const url = URL.createObjectURL(blob)
    urls.current.set(k.id, url)
    return url
  }, [caseId, podcastId])

  /** Ein Kapitel anspringen — und, wenn gewünscht, gleich abspielen. */
  const zu = useCallback(async (neu: number, sofort: boolean) => {
    const k = spielbar[neu]
    if (!k || !audioRef.current) return
    setIndex(neu)
    setFehler(null)
    setHolt(true)
    try {
      audioRef.current.src = await quelleHolen(k)
      if (sofort) await audioRef.current.play()
    } catch {
      // Ein abgebrochener Abruf ist kein Absturz. Wer auf ein Kapitel tippt und nichts
      // hört, braucht einen Satz — und der steht hier, nicht in der Konsole.
      setFehler('Dieses Kapitel lässt sich gerade nicht laden.')
      setLaeuft(false)
    } finally {
      setHolt(false)
    }
  }, [quelleHolen, spielbar])

  const umschalten = async () => {
    const a = audioRef.current
    if (!a) return
    if (laeuft) { a.pause(); return }
    if (!a.src) { await zu(index, true); return }
    try { await a.play() } catch { setFehler('Abspielen geht gerade nicht.') }
  }

  if (spielbar.length === 0) return null

  return (
    <section className="rounded-brand-lg border border-accent/30 bg-accent/[0.04] p-5">
      <audio
        ref={audioRef}
        onPlay={() => setLaeuft(true)}
        onPause={() => setLaeuft(false)}
        onTimeUpdate={e => setStand(e.currentTarget.currentTime)}
        // Am Ende eines Kapitels das nächste — so entsteht aus Stücken eine Folge.
        onEnded={() => {
          if (index + 1 < spielbar.length) void zu(index + 1, true)
          else { setLaeuft(false); setStand(0) }
        }}
        preload="none"
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={umschalten}
          disabled={holt}
          aria-label={laeuft ? 'Pause' : 'Abspielen'}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-white transition-transform hover:scale-105 disabled:opacity-50 motion-reduce:hover:scale-100"
        >
          {holt ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : laeuft ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9rem] font-semibold text-navy">{aktuell?.titel}</p>
          <p className="text-[0.74rem] text-brand-muted">
            Kapitel {index + 1} von {spielbar.length}
            {aktuell?.sekunden ? ` · ${zeit(stand)} / ${zeit(aktuell.sekunden)}` : ''}
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-brand-border">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-linear"
              style={{
                width: `${aktuell?.sekunden
                  ? Math.min(100, Math.round(stand / aktuell.sekunden * 100)) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {fehler && <p role="alert" className="mt-3 text-sm text-red-600">{fehler}</p>}

      {/* Die Kapitelliste ist zugleich die Sprungmarke. Sie steht offen da und nicht hinter
          einem Aufklapper: Wer eine Folge zum zweiten Mal hört, will meistens an eine
          bestimmte Stelle. */}
      <ul className="mt-4 space-y-1 border-t border-accent/20 pt-3">
        {spielbar.map((k, i) => (
          <li key={k.id}>
            <button
              type="button"
              onClick={() => void zu(i, true)}
              className={`flex w-full items-baseline gap-3 rounded-brand-sm px-2 py-1.5 text-left transition-colors ${
                i === index ? 'bg-accent/10 text-navy' : 'text-brand-text hover:bg-white'
              }`}
            >
              <span className="w-5 shrink-0 text-[0.72rem] tabular-nums text-brand-muted">
                {i + 1}
              </span>
              <span className={`min-w-0 flex-1 truncate text-[0.84rem] ${
                i === index ? 'font-semibold' : ''
              }`}>
                {k.titel}
              </span>
              <span className="shrink-0 text-[0.72rem] tabular-nums text-brand-muted">
                {zeit(k.sekunden)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
