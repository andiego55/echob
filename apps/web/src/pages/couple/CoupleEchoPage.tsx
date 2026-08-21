/**
 * /app/paar/:coupleId/echo — dein persönlicher Paar-Begleiter.
 *
 * Wie der Echo-Dialog im Fall: reden, zusammenfassen lassen, behalten. Echo kennt hier
 * BEIDE Welten – deinen eigenen Fallzusammenhang und den Stand eures gemeinsamen Raums.
 * Genau deshalb ist der Dialog privat: Fallinhalte dürfen nie in einen Raum, den beide lesen.
 *
 * Die Seite ist nur noch Rahmen und Inhalt: Der Dialog selbst steckt in ``EchoChat``, den
 * sich diese Seite mit dem Streit-Einstieg teilt. Vorher hatten beide je eine eigene
 * Fassung — und beide dieselbe Schwäche: eine 300 px breite Spalte voller Startpunkte, die
 * nur am Anfang zählen und das Gespräch für immer an den Rand drückten.
 */
import { useParams } from 'react-router-dom'
import CoupleShell from '@/components/couple/CoupleShell'
import CoupleSafetyNote from '@/components/couple/CoupleSafetyNote'
import EchoChat from '@/components/couple/EchoChat'
import type { Impulsgruppe } from '@/components/couple/EchoChat'

/** Startpunkte, sortiert nach dem, was gerade los ist. */
const IMPULSE: Impulsgruppe[] = [
  {
    gruppe: 'Wo anfangen?',
    eintraege: [
      { label: 'Worüber sollten wir reden?',
        text: 'Ich weiß nicht recht, wo wir anfangen sollen. Hilf mir herauszufinden, welches Thema bei uns gerade wirklich dran ist.' },
      { label: 'Was ist dringend, was kann warten?',
        text: 'Bei uns liegt gerade vieles gleichzeitig an. Hilf mir zu sortieren, was dringend ist und was warten kann.' },
      { label: 'Kleines Thema zum Üben',
        text: 'Ich würde gern mit etwas Kleinem anfangen, um das Format zu üben. Schlag mir ein überschaubares Thema vor.' },
    ],
  },
  {
    gruppe: 'Bevor ich es sage',
    eintraege: [
      { label: 'Wie sage ich das?',
        text: 'Ich möchte etwas ansprechen, weiß aber nicht, wie ich es sage, ohne dass es als Vorwurf ankommt. Ich erzähl dir, worum es geht.' },
      { label: 'Aus Wut ein Anliegen machen',
        text: 'Ich bin gerade wütend und will nichts kaputtmachen. Hilf mir, aus meiner Wut ein Anliegen zu formulieren.' },
      { label: 'Eine Bitte formulieren',
        text: 'Ich möchte um etwas bitten, ohne zu fordern. Hilf mir, eine konkrete, kleine Bitte zu finden.' },
    ],
  },
  {
    gruppe: 'Nach einem Streit',
    eintraege: [
      { label: 'Erst mal runterkommen',
        text: 'Wir hatten gerade Streit und ich bin noch aufgewühlt. Hilf mir, erst einmal herunterzukommen.' },
      { label: 'Was ist da passiert?',
        text: 'Ich verstehe nicht ganz, warum unser letztes Gespräch gekippt ist. Lass uns anschauen, was da passiert ist.' },
      { label: 'Wieder aufeinander zugehen',
        text: 'Wir reden gerade kaum. Wie können wir wieder aufeinander zugehen, ohne dass es sich erzwungen anfühlt?' },
    ],
  },
  {
    gruppe: 'Muster verstehen',
    eintraege: [
      { label: 'Warum wiederholt sich das?',
        text: 'Bei uns wiederholt sich immer dieselbe Schleife. Hilf mir zu verstehen, was sie am Laufen hält.' },
      { label: 'Mein eigener Anteil',
        text: 'Ich möchte ehrlich auf meinen eigenen Anteil schauen. Sei dabei freundlich, aber nicht schonend.' },
      { label: 'Was brauche ich eigentlich?',
        text: 'Ich merke, dass mir etwas fehlt, kann es aber nicht benennen. Hilf mir herauszufinden, was ich eigentlich brauche.' },
    ],
  },
  {
    gruppe: 'Konkret werden',
    eintraege: [
      { label: 'Drei kleine Rituale',
        text: 'Schlag mir drei kleine Rituale vor, die im Alltag realistisch sind und uns näherbringen könnten.' },
      { label: 'Was war zuletzt gut?',
        text: 'Ich will nicht nur auf Probleme schauen. Hilf mir zu benennen, was bei uns zuletzt gut lief.' },
      { label: 'Ein nächster Schritt',
        text: 'Was wäre ein einziger, machbarer nächster Schritt für uns – etwas, das ich noch diese Woche tun kann?' },
    ],
  },
]

const THEMEN = [
  'Nähe und Distanz', 'Zeit füreinander', 'Streitkultur', 'Geld', 'Haushalt und Fairness',
  'Sexualität', 'Kinder und Erziehung', 'Schwiegerfamilie', 'Eifersucht', 'Vertrauen',
  'Beruflicher Stress', 'Zukunftspläne', 'Anerkennung', 'Autonomie', 'Verlässlichkeit',
]

export default function CoupleEchoPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()

  return (
    <CoupleShell subtitle="Nur für dich – Echo kennt deinen Fall und euren Raum.">
      <EchoChat
        coupleId={coupleId}
        kind="chat"
        impulse={IMPULSE}
        themen={THEMEN}
        leerTitel="Was beschäftigt dich?"
        leerText="Schreib einfach los – oder nimm einen Startpunkt. Was hier steht, bleibt bei
          dir. Am Ende lässt du das Gespräch zusammenfassen; die Zusammenfassung findest du
          danach auf eurer Übersicht wieder."
        platzhalter="Schreib, was dich beschäftigt …"
        abschlussZuege={['abmachung', 'gespraech', 'thema']}
      />
      <CoupleSafetyNote />
    </CoupleShell>
  )
}
