/**
 * Wohin man von der öffentlichen Kopfzeile aus kommt.
 *
 * Steht getrennt von der Darstellung, weil dieselben Ziele in zwei Formen gebraucht werden:
 * am Schreibtisch als Klappmenü mit Symbolen und Teasern, auf dem Telefon als schlichte
 * Liste. Zwei Abschriften derselben Links würden auseinanderlaufen — und dann fehlt eine
 * neue Seite genau in der Fassung, die man selbst nie benutzt.
 */

export interface MenueEintrag { label: string; to: string }
export interface MenueGruppe { titel: string; eintraege: MenueEintrag[] }

/**
 * Die Gliederung fürs Telefon.
 *
 * Bewusst flach: Auf einem kleinen Schirm zählt, in wie wenigen Blicken man sein Ziel
 * findet. Eine zweite Ebene zum Aufklappen würde jede Suche verdoppeln.
 */
export const MENUE_GRUPPEN: MenueGruppe[] = [
  {
    titel: 'Für dich',
    eintraege: [
      { label: 'Start',            to: '/' },
      { label: 'Coaching',         to: '/coaching' },
      { label: 'Paartherapie',     to: '/paartherapie' },
      { label: 'Passt ihr zusammen?', to: '/kompatibilitaet' },
    ],
  },
  {
    titel: 'Wissen',
    eintraege: [
      { label: 'Alle Themen',      to: '/wissen' },
      { label: 'Beziehungsszenen', to: '/szenen' },
      { label: 'Selbsttests',      to: '/selbsttests' },
      { label: 'Glossar',          to: '/glossar' },
    ],
  },
  {
    titel: 'Beziehungsdynamiken',
    eintraege: [
      { label: 'Beziehungsmuster erkennen', to: '/wissen/beziehungsmuster' },
      { label: 'Emotionale Manipulation',   to: '/wissen/emotionale-manipulation' },
      { label: 'Gaslighting oder Missverständnis?', to: '/wissen/gaslighting-oder-missverstaendnis' },
      { label: 'Bindungsstile',             to: '/wissen/bindungsstile' },
      { label: 'Kommunikation & Konflikte', to: '/wissen/kommunikation-konflikte' },
      { label: 'Grenzen setzen',            to: '/wissen/grenzen-setzen' },
    ],
  },
  {
    titel: 'Hilfe finden',
    eintraege: [
      { label: 'Wann professionelle Hilfe sinnvoll ist', to: '/wissen/professionelle-hilfe' },
      { label: 'Krisentelefone & Anlaufstellen',         to: '/wissen/krisentelefone' },
    ],
  },
  {
    titel: 'Fachpersonen',
    eintraege: [
      { label: 'Fachperson finden',   to: '/fachpersonen' },
      { label: 'Für Fachpersonen',    to: '/fuer-fachpersonen' },
      { label: 'Forschung & Studie',  to: '/forschung' },
      { label: 'Ausbildungsinstitute', to: '/ausbildungsinstitute' },
    ],
  },
  {
    titel: 'Über EchoB',
    eintraege: [
      { label: 'Über uns',   to: '/ueber' },
      { label: 'Mission',    to: '/ueber/mission' },
      { label: 'Der Gründer', to: '/ueber/gruender' },
      { label: 'Team',       to: '/ueber/team' },
    ],
  },
]
