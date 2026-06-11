import PageLayout from '@/components/layout/PageLayout'
import BlogArticleLayout from '@/components/layout/BlogArticleLayout'

export default function WissenKommunikationPage() {
  return (
    <PageLayout>
      <BlogArticleLayout
        tag="Beziehungsdynamiken"
        title="Kommunikation & Konflikte"
        subtitle="Warum Gespräche eskalieren – und was dahintersteckt · 8 Min. Lesezeit"
        backLink="/wissen"
        backLabel="Zurück zum Wissen"
        echoLink="/app?wissen=kommunikation"
        echoTitle="Beschreibe eine konkrete Konfliktsituation"
        echoText="Echo hilft dir, eine bestimmte Gesprächssituation zu analysieren – was wurde gesagt, wie hat es sich angefühlt, und was hat sich wiederholt?"
        echoCta="Situation mit Echo besprechen →"
        echoSteps={['Anmelden oder Konto erstellen', 'Fall anlegen und Szene beschreiben', 'Echo-Dialog starten']}
      >
        <p>
          Die meisten Beziehungskonflikte verlaufen nicht zufällig. Es gibt erkennbare Muster in der
          Art, wie Gespräche kippen – von sachlicher Auseinandersetzung zu verletzender Eskalation.
          Diese Muster zu kennen, ist der erste Schritt, sie zu unterbrechen.
        </p>

        <h2>Die vier Horsemen nach Gottman</h2>
        <p>
          Der Psychologe John Gottman hat in jahrzehntelanger Paarforschung vier Kommunikationsmuster
          identifiziert, die er als die zuverlässigsten Prädiktoren für Beziehungsscheitern beschreibt.
          Er nennt sie die „Vier Reiter der Apokalypse":
        </p>
        <ul>
          <li>
            <strong>Kritik:</strong> Angriffe auf den Charakter der Person statt auf ein konkretes Verhalten.
            „Du bist so egozentrisch" statt „Ich brauche mehr Unterstützung".
          </li>
          <li>
            <strong>Verachtung:</strong> Das destruktivste Muster. Augenverdrehender Sarkasmus, Spott,
            Herabwürdigung. Sendet die Botschaft: Du bist minderwertig.
          </li>
          <li>
            <strong>Defensivität:</strong> Statt Verantwortung zu übernehmen wird jeder Einwand
            als Angriff gewertet und abgewehrt. Setzt den Kreislauf fort.
          </li>
          <li>
            <strong>Mauern (Stonewalling):</strong> Vollständiger Rückzug aus dem Gespräch.
            Kein Blickkontakt, keine Reaktion, monosyllabische Antworten oder Verlassen des Raums.
            Oft ein Zeichen von Überwältigung, nicht von Gleichgültigkeit.
          </li>
        </ul>

        <h2>Eskalationszyklen</h2>
        <p>
          Konflikte eskalieren selten linear. Häufiger gibt es eine Schleife: Person A äußert ein
          Bedürfnis vorwurfsvoll (Kritik) → Person B reagiert defensiv → A empfindet das als Ablehnung
          und eskaliert → B zieht sich zurück (Mauern) → A fühlt sich verlassen und eskaliert weiter.
        </p>
        <p>
          Beide stecken im Kreislauf. Beide erleben sich als Opfer der anderen. Beide haben recht –
          und beide tragen zum Muster bei.
        </p>

        <h2>Gaslighting</h2>
        <p>
          Gaslighting bezeichnet ein Kommunikationsmuster, bei dem jemand die Wahrnehmung einer anderen
          Person systematisch in Frage stellt: „Das hast du dir eingebildet." „Du reagierst über."
          „So war das nicht gemeint – du bist zu empfindlich."
        </p>
        <p>
          Wichtig: Gaslighting kann unbewusst geschehen. Es ist nicht immer manipulative Absicht –
          manchmal ist es eine Schutzreaktion auf wahrgenommene Kritik. Das macht es trotzdem nicht
          weniger belastend für die betroffene Person.
        </p>
        <p>
          Signale für Gaslighting: Man zweifelt häufig an der eigenen Wahrnehmung, entschuldigt sich
          reflexartig, traut sich weniger zu äußern als früher.
        </p>

        <h2>Asymmetrische Kommunikationsdynamiken</h2>
        <p>
          In belasteten Beziehungen entsteht oft ein Ungleichgewicht: Eine Person trägt den
          größten Teil der emotionalen Arbeit – erklärt, moderiert, entschuldigt. Die andere
          Person definiert (implizit), welche Themen besprechbar sind.
        </p>
        <p>
          Wer immer derjenige ist, der nachgibt, um den Frieden zu wahren, bezahlt dafür
          mit langfristiger Erschöpfung und dem Gefühl, nicht wirklich gehört zu werden.
        </p>

        <h2>De-Eskalation: Was funktioniert</h2>
        <p>
          Gottman's Gegenmittel zu den vier Reitern:
        </p>
        <ul>
          <li><strong>Zu Kritik:</strong> Sanfter Einstieg – Ich-Botschaften statt Du-Angriffe.</li>
          <li><strong>Zu Verachtung:</strong> Wertschätzungskultur im Alltag aufbauen; konkrete Dankbarkeit äußern.</li>
          <li><strong>Zu Defensivität:</strong> Verantwortung für den eigenen Anteil übernehmen, auch wenn es nur 10 % sind.</li>
          <li><strong>Zu Mauern:</strong> Pause statt Rückzug – kurze Auszeit ankündigen und dann zurückkommen.</li>
        </ul>
        <p>
          Keine dieser Techniken löst ein tiefes Beziehungsproblem allein. Aber sie können
          Gespräche aus dem Eskalationsmuster herausbringen – genug, um sachlich zu kommunizieren.
        </p>

        <blockquote>
          „In glücklichen Beziehungen gibt es genauso viele Konflikte wie in unglücklichen.
          Der Unterschied liegt in der Art, wie sie ausgetragen werden."
          <br /><em>– John Gottman</em>
        </blockquote>
      </BlogArticleLayout>
    </PageLayout>
  )
}
