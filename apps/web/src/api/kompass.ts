/**
 * Mein Kompass — Puls, Verlauf, Krisenplan.
 *
 * **Der einzige Teil der Nutzer-API ohne Fall.** Alle anderen Aufrufe hier hängen unter
 * `/cases/{id}/…`; dieser nicht. Das ist das Versprechen des Raums: den eigenen Zustand
 * festhalten, ohne vorher einen Fall anzulegen.
 *
 * **Das Vokabular kommt vom Server.** Zustände, Wortfamilien und die Abschnitte des
 * Krisenplans stehen im Katalog des Backends, nicht hier. Sonst führt die Oberfläche eine
 * zweite Liste, die irgendwann von der ersten abweicht — und niemand merkt es, weil beide
 * für sich stimmig aussehen.
 */
import { apiClient } from './client'
import type { GbWortFamilie } from './gefuehlsbild'

/** Eine der fünf Stufen. Gespeichert wird `wert`, angezeigt `label`. */
export interface KompassZustand {
  wert: number
  label: string
  hinweis: string
}

export interface KompassAnspannung {
  label: string
  links: string
  rechts: string
  min: number
  max: number
}

export interface KrisenplanTeil {
  key: string
  label: string
  hinweis: string
  beispiel: string
}

/** Eine der sechs Arten, mit Erklärung und Beispiel — beides kommt vom Server. */
export interface SatzArt {
  key: string
  label: string
  hinweis: string
  beispiel: string
}

export interface SatzStand {
  key: string
  label: string
  hinweis: string
}

export interface VorhabenStand {
  key: string
  label: string
  hinweis: string
}

export interface RueckschauRhythmus {
  tage: number
  label: string
}

export interface BriefAbstand {
  tage: number
  label: string
}

export interface KompassKatalog {
  zustaende: KompassZustand[]
  /** Ab dieser Stufe fragt der Puls, was geholfen hat. */
  guter_zustand_ab: number
  anspannung: KompassAnspannung
  /** Dieselben Wortfamilien wie im Gefühlsbild — bewusst, nicht zufällig. */
  wortfamilien: GbWortFamilie[]
  krisenplan_teile: KrisenplanTeil[]
  satz_arten: SatzArt[]
  /** Nur die drei sichtbaren. „Verworfen" ist kein Stand, den jemand wählt. */
  satz_staende: SatzStand[]
  satz_max_zeichen: number
  vorhaben_staende: VorhabenStand[]
  rueckschau_rhythmen: RueckschauRhythmus[]
  vorhaben_max_titel: number
  schritt_max_zeichen: number
  max_schritte: number
  /** Drei benannte Abstände, keine dreißig Zahlen. */
  brief_abstaende: BriefAbstand[]
  brief_max_zeichen: number
}

export interface Puls {
  id: string
  zustand: number
  zustand_label: string | null
  anspannung: number | null
  worte: string[]
  notiz: string | null
  geholfen: string | null
  case_id: string | null
  created_at: string
}

/** Nur `zustand` ist Pflicht. Alles andere darf fehlen — das ist der ganze Punkt. */
export interface PulsNeu {
  zustand: number
  anspannung?: number | null
  worte?: string[]
  notiz?: string | null
  geholfen?: string | null
  case_id?: string | null
}

export interface Krisenplan {
  /** Abschnitt → Zeilen. Die Schlüssel stehen im Katalog, nicht in diesem Typ. */
  inhalt: Record<string, unknown>
  updated_at: string | null
}

/**
 * Ein Satz über die eigene Person.
 *
 * **`bestaetigt_at` gehört sichtbar in die Oberfläche.** Ein bestätigter Satz ist eine
 * Selbsteinschätzung von dem Tag, an dem jemand zugestimmt hat — kein Befund und keine
 * Eigenschaft. Ohne das Datum liest er sich wie eine Tatsache über einen Menschen.
 */
export interface Satz {
  id: string
  art: string
  art_label: string | null
  text: string
  stand: 'entwurf' | 'bestaetigt' | 'ueberholt'
  herkunft: 'selbst' | 'szene' | 'puls' | 'echo'
  szene_id: string | null
  puls_id: string | null
  angeheftet: boolean
  /**
   * Woran Echo den Vorschlag festmacht — „Das kam in drei Situationen vor".
   *
   * Nur bei Vorschlägen gesetzt. Er gehört sichtbar neben den Satz: Ohne Beleg ist
   * Zustimmen ein Raten, und ein Vorschlag über die eigene Person will überlegt werden.
   */
  grund: string | null
  created_at: string
  bestaetigt_at: string | null
  /**
   * Wann zuletzt „Stimmt das noch?" beantwortet wurde.
   *
   * Ausdrücklich NICHT dasselbe wie `bestaetigt_at`: Wer beim Nachfragen das
   * Zustimmungsdatum hochzählt, macht aus jedem alten Satz einen frischen und löscht
   * genau die Auskunft, um die es geht.
   */
  geprueft_at: string | null
  /** Der Satz, aus dem dieser geworden ist — „hat sich verändert". */
  vorgaenger_id: string | null
  updated_at: string
}

/** Die Herkunft wird abgeleitet, nicht mitgeschickt — sie lässt sich nicht behaupten. */
export interface SatzNeu {
  art: string
  text: string
  szene_id?: string | null
  puls_id?: string | null
}

export interface SatzAenderung {
  text?: string
  art?: string
  stand?: 'entwurf' | 'bestaetigt' | 'ueberholt'
  angeheftet?: boolean
}

/** Was ein Lauf ergeben hat. `hinweis` erklärt eine leere Liste, statt sie zu lassen. */
export interface VorschlagsLauf {
  vorschlaege: Satz[]
  hinweis: string | null
}

/** Ein Schritt eines Vorhabens. `id` fehlt nur, solange er noch nicht gespeichert ist. */
export interface Schritt {
  id?: string | null
  text: string
  erledigt_at?: string | null
}

export interface Vorhaben {
  id: string
  titel: string
  warum: string | null
  schritte: Schritt[]
  schritte_erledigt: number
  rhythmus_tage: number
  /** Wann zuletzt zurückgeschaut wurde. Ob daraus „fällig" folgt, rechnet `lib/kompass`. */
  rueckschau_am: string | null
  stand: 'laufend' | 'erreicht' | 'ruht'
  stand_label: string | null
  created_at: string
  updated_at: string
}

export interface VorhabenNeu {
  titel: string
  warum?: string | null
  schritte?: Schritt[]
  rhythmus_tage?: number
}

export interface VorhabenAenderung {
  titel?: string
  warum?: string | null
  schritte?: Schritt[]
  rhythmus_tage?: number
  stand?: 'laufend' | 'erreicht' | 'ruht'
  /** Nur setzen, wenn wirklich zurückgeschaut wurde — sonst ist der Rhythmus wertlos. */
  zurueckgeschaut?: boolean
}

/** Eine Frage einer geführten Übung. Der Hinweis ist für dich, nicht für Echo. */
/** Eine Seite eines Gegensatzpaares. */
export interface Pol {
  key: string
  label: string
}

export interface Gegensatzpaar {
  key: string
  links: Pol
  rechts: Pol
}

/**
 * Ein Schritt einer Übung — und seine Eingabeform.
 *
 * Die zweite Grammatik des Kompasses: `text` ist ein Feld zum Schreiben, `paare` sind
 * Gegensätze zum Antippen. Der Grund steht im Gefühlsbild-Katalog und gilt überall: Wer
 * belastet ist, hat die Worte oft nicht.
 */
export interface UebungsSchritt {
  frage: string
  hinweis: string
  platzhalter: string
  form: 'text' | 'paare'
  /** Nur bei `paare`. Die Antwort sind die Schlüssel der angetippten Pole. */
  paare: Gegensatzpaar[]
}

export interface Uebung {
  key: string
  label: string
  hinweis: string
  dauer: string
  /** Was am Ende herauskommt: `satz` oder `vorhaben`. */
  ergibt: 'satz' | 'vorhaben'
  /** Wie viele Schritte beantwortet sein müssen. Meist zwei. */
  mindestens: number
  schritte: UebungsSchritt[]
}

/**
 * Was eine Übung ergeben hat — genau eines von beiden, oder keins.
 *
 * Das Ergebnis ist ein ENTWURF: Es liegt schon im Kompass, gilt aber erst mit deiner
 * Zustimmung. Deshalb muss man es nicht sofort entscheiden.
 */
export interface UebungsErgebnis {
  satz: Satz | null
  vorhaben: Vorhaben | null
  hinweis: string | null
}

/**
 * Ein Selbstporträt — ein Entwurf oder eine datierte Momentaufnahme.
 *
 * Ein bestätigtes Porträt ist unveränderlich. Bearbeitet wird der Entwurf; das vom März
 * neben dem vom September zu lesen, ist die Entwicklungsanzeige.
 */
export interface Portrait {
  id: string
  status: 'entwurf' | 'bestaetigt'
  text: string
  created_at: string
  updated_at: string
  bestaetigt_at: string | null
}

export interface PortraitStand {
  entwurf: Portrait | null
  verlauf: Portrait[]
  /** Ob gerade ein neues entstehen darf. */
  bereit: boolean
  /** Warum nicht — steht nur da, wenn `bereit` falsch ist. */
  grund: string | null
}

/** Echos Fassung. Gespeichert ist damit noch nichts. */
export interface PortraitVorschlag {
  text: string
  hinweis: string | null
}

/** Ein Punkt auf der Zeitachse. */
export interface SpurEreignis {
  art: 'puls' | 'satz' | 'vorhaben' | 'schritt' | 'portrait' | 'szene'
  am: string
  titel: string
  /** Ein kurzer Ausschnitt, nie der ganze Text. */
  detail: string | null
  /** Nur bei Pulsen — färbt den Punkt. */
  zustand: number | null
  ziel: string | null
}

/**
 * Was seit dem Anfang eines Vorhabens dazugekommen ist.
 *
 * Ausdrücklich KEIN Prozentwert: `zaehlung` sagt, wie viel seitdem da ist, nicht wie
 * weit jemand ist. Ob es zusammengehört, liest die Person selbst.
 */
export interface Belege {
  seit: string
  zaehlung: Partial<Record<SpurEreignis['art'], number>>
  ereignisse: SpurEreignis[]
}

/**
 * Ein Brief an das eigene Ich.
 *
 * `text` fehlt, solange der Brief zu ist — und das entscheidet der Server. Hier steht
 * `string | null`, damit niemand auf die Idee kommt, sich darauf zu verlassen.
 */
export interface Brief {
  id: string
  oeffnet_am: string
  offen: boolean
  text: string | null
  gelesen_at: string | null
  created_at: string
}

/** Die Arten, die auf die Tagesordnung können. Dieselben wie im Dienst. */
export type AgendaArt = 'satz' | 'puls' | 'portrait'

/**
 * Ein Punkt der Tagesordnung, fertig zum Vorlesen.
 *
 * `titel` und `unterzeile` bildet der Server — sonst gäbe es drei Stellen, an denen ein
 * Puls beschrieben wird, und sie liefen auseinander.
 */
export interface AgendaPunkt {
  id: string
  art: AgendaArt
  ziel_id: string
  titel: string
  unterzeile: string | null
  notiz: string | null
  wann: string | null
  created_at: string
}

/** Welche Kennungen je Art schon auf der Liste stehen. */
export type AgendaMarkierungen = Record<AgendaArt, string[]>

/** Der alte Satz, der gerade wieder vorgelegt wird — meistens keiner. */
export interface Pruefung {
  satz: Satz | null
}

/** Beide Sätze nebeneinander. `neu` steht nur bei „hat sich verändert". */
export interface PruefungsErgebnis {
  alt: Satz
  neu: Satz | null
}

export interface KompassUebersicht {
  letzter_puls: Puls | null
  verlauf: Puls[]
  /** Wie viele Momente im Zeitraum — eine Zahl, keine Serie. */
  rhythmus: number
  verlauf_tage: number
  krisenplan_vorhanden: boolean
  /** Wie viele Punkte auf der Tagesordnung stehen. */
  agenda_anzahl: number
  /** Ob ein Brief an dich selbst heute aufgeht und noch nicht gelesen ist. */
  brief_wartet: boolean
  /** Ob ein alter Satz auf „Stimmt das noch?" wartet. */
  frage_wartet: boolean
  saetze_bestaetigt: number
  vorhaben_laufend: number
  portrait_bereit: boolean
  /**
   * Wie viele es schon gibt.
   *
   * Ohne diese Zahl liesse sich „noch keines, und noch nicht soweit" nicht von „eines da,
   * gerade nicht fällig" unterscheiden — und die Startseite lüde zu einer Seite ein, die
   * nur „jetzt nicht" sagt.
   */
  portraits_anzahl: number
}

const basis = '/me/kompass'

export const kompassApi = {
  katalog: () =>
    apiClient.get<KompassKatalog>(`${basis}/katalog`).then(r => r.data),

  uebersicht: () =>
    apiClient.get<KompassUebersicht>(basis).then(r => r.data),

  pulsAnlegen: (puls: PulsNeu) =>
    apiClient.post<Puls>(`${basis}/puls`, puls).then(r => r.data),

  pulsLoeschen: (pulsId: string) =>
    apiClient.delete(`${basis}/puls/${pulsId}`).then(() => undefined),

  verlauf: (tage?: number) =>
    apiClient
      .get<Puls[]>(`${basis}/verlauf`, tage ? { params: { tage } } : undefined)
      .then(r => r.data),

  krisenplan: () =>
    apiClient.get<Krisenplan>(`${basis}/krisenplan`).then(r => r.data),

  krisenplanSpeichern: (inhalt: Record<string, string[]>) =>
    apiClient.put<Krisenplan>(`${basis}/krisenplan`, { inhalt }).then(r => r.data),

  saetze: () =>
    apiClient.get<Satz[]>(`${basis}/saetze`).then(r => r.data),

  satzAnlegen: (satz: SatzNeu) =>
    apiClient.post<Satz>(`${basis}/saetze`, satz).then(r => r.data),

  satzAendern: (satzId: string, aenderung: SatzAenderung) =>
    apiClient.patch<Satz>(`${basis}/saetze/${satzId}`, aenderung).then(r => r.data),

  satzLoeschen: (satzId: string) =>
    apiClient.delete(`${basis}/saetze/${satzId}`).then(() => undefined),

  /**
   * Echo liest die letzten Szenen und Momente und schlägt Sätze vor.
   *
   * Dauert länger als die übrigen Aufrufe — hier spricht ein Modell. Die Vorschläge
   * werden serverseitig als Entwürfe abgelegt; die Antwort ist nur die Abkürzung.
   */
  vorschlaegeHolen: () =>
    apiClient
      .post<VorschlagsLauf>(`${basis}/saetze/vorschlaege`, undefined, { timeout: 60_000 })
      .then(r => r.data),

  vorhaben: () =>
    apiClient.get<Vorhaben[]>(`${basis}/vorhaben`).then(r => r.data),

  vorhabenAnlegen: (v: VorhabenNeu) =>
    apiClient.post<Vorhaben>(`${basis}/vorhaben`, v).then(r => r.data),

  vorhabenAendern: (id: string, aenderung: VorhabenAenderung) =>
    apiClient.patch<Vorhaben>(`${basis}/vorhaben/${id}`, aenderung).then(r => r.data),

  vorhabenLoeschen: (id: string) =>
    apiClient.delete(`${basis}/vorhaben/${id}`).then(() => undefined),

  uebungen: () =>
    apiClient.get<Uebung[]>(`${basis}/uebungen`).then(r => r.data),

  /** Dauert länger als die übrigen Aufrufe — hier spricht ein Modell. */
  uebungAbschliessen: (schluessel: string, antworten: string[]) =>
    apiClient
      .post<UebungsErgebnis>(
        `${basis}/uebungen/${schluessel}/abschliessen`,
        { antworten },
        { timeout: 60_000 },
      )
      .then(r => r.data),

  vorschlagEntscheiden: (satzId: string, annehmen: boolean) =>
    apiClient
      .post<Satz>(`${basis}/saetze/${satzId}/entscheidung`, { annehmen })
      .then(r => r.data),

  /**
   * Alles Festgehaltene auf einer Achse, neueste zuerst.
   *
   * `szenen` ist aus, bis jemand es einschaltet: Szenen gehören zu Fällen, und der
   * Kompass ist der Raum ohne Fall.
   */
  agenda: () =>
    apiClient.get<AgendaPunkt[]>(`${basis}/agenda`).then(r => r.data),

  /** Eine Abfrage für alle Karten — und ohne einen Text zu entschlüsseln. */
  agendaMarkierungen: () =>
    apiClient.get<AgendaMarkierungen>(`${basis}/agenda/markierungen`).then(r => r.data),

  agendaDazu: (art: AgendaArt, zielId: string, notiz?: string) =>
    apiClient
      .post<AgendaPunkt>(`${basis}/agenda`,
        { art, ziel_id: zielId, notiz: notiz ?? null })
      .then(r => r.data),

  agendaWeg: (eintragId: string) =>
    apiClient.delete(`${basis}/agenda/${eintragId}`).then(() => undefined),

  briefe: () =>
    apiClient.get<Brief[]>(`${basis}/briefe`).then(r => r.data),

  briefSchreiben: (text: string, tage: number) =>
    apiClient.post<Brief>(`${basis}/briefe`, { text, tage }).then(r => r.data),

  /** Öffnet ihn — wenn sein Tag gekommen ist. Vorher 404, wie „gibt es nicht". */
  briefOeffnen: (id: string) =>
    apiClient.post<Brief>(`${basis}/briefe/${id}/oeffnen`).then(r => r.data),

  briefZuruecknehmen: (id: string) =>
    apiClient.delete(`${basis}/briefe/${id}`).then(() => undefined),

  pruefung: () =>
    apiClient.get<Pruefung>(`${basis}/pruefung`).then(r => r.data),

  pruefungBeantworten: (satzId: string, antwort: string, neuerText?: string) =>
    apiClient
      .post<PruefungsErgebnis>(`${basis}/pruefung/${satzId}`,
        { antwort, neuer_text: neuerText ?? null })
      .then(r => r.data),

  spur: (tage: number, szenen: boolean) =>
    apiClient
      .get<SpurEreignis[]>(`${basis}/spur`, { params: { tage, szenen } })
      .then(r => r.data),

  /**
   * Die bestätigten Sätze, die aus dieser Szene gewachsen sind — der Rückverweis.
   *
   * Unter `/me/kompass` und nicht unter dem Fall: Was herauskommt, sind Sätze über die
   * Person, und die gehören in den Raum, der ihr gehört.
   */
  saetzeZuSzene: (szeneId: string) =>
    apiClient.get<Satz[]>(`${basis}/szenen/${szeneId}/saetze`).then(r => r.data),

  vorhabenBelege: (id: string) =>
    apiClient.get<Belege>(`${basis}/vorhaben/${id}/belege`).then(r => r.data),

  portrait: () =>
    apiClient.get<PortraitStand>(`${basis}/portrait`).then(r => r.data),

  /**
   * Echo schreibt einen Vorschlag — **speichert nichts**.
   *
   * Der längste Aufruf im Kompass: Es geht mehr Material hin und mehrere Absätze zurück.
   * Ist gerade kein neues Porträt fällig, kommt ein leerer Text mit `hinweis` zurück —
   * kein Fehler, sondern die Antwort auf die Frage.
   */
  portraitSchreiben: () =>
    apiClient
      .post<PortraitVorschlag>(`${basis}/portrait/schreiben`, undefined,
        { timeout: 120_000 })
      .then(r => r.data),

  portraitSichern: (text: string) =>
    apiClient.put<Portrait>(`${basis}/portrait`, { text }).then(r => r.data),

  portraitBestaetigen: () =>
    apiClient.post<Portrait>(`${basis}/portrait/bestaetigen`).then(r => r.data),

  portraitEntwurfVerwerfen: () =>
    apiClient.delete(`${basis}/portrait/entwurf`).then(() => undefined),
}
