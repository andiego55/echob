import PageLayout from '@/components/layout/PageLayout'
import BlogArticleLayout from '@/components/layout/BlogArticleLayout'

export default function WissenBindungsstilelPage() {
  return (
    <PageLayout>
      <BlogArticleLayout
        tag="Beziehungsdynamiken"
        title="Bindungsstile"
        subtitle="Wie frühe Bindungserfahrungen unsere Beziehungen prägen · 9 Min. Lesezeit"
        backLink="/wissen"
        backLabel="Zurück zum Wissen"
        echoLink="/app?wissen=bindungsstile"
        echoTitle="Erkenne deinen Bindungsstil im Kontext deiner Situation"
        echoText="Echo hilft dir, konkrete Situationen zu beschreiben und zu verstehen, welche Bindungsmuster dabei sichtbar werden – als Reflexionshilfe, nicht als Diagnose."
        echoCta="Mit Echo reflektieren →"
        echoSteps={['Anmelden oder Konto erstellen', 'Fall anlegen und Szene beschreiben', 'Echo-Dialog starten']}
      >
        <p>
          Wie wir Nähe erleben, ob wir Verlassenwerden fürchten oder Intimität meiden – vieles davon
          hat Wurzeln, die weit vor unserer aktuellen Beziehung liegen. Die Bindungstheorie erklärt,
          wie frühe Erfahrungen mit Bezugspersonen unser Beziehungsverhalten als Erwachsene prägen.
        </p>

        <h2>Was ist Bindungstheorie?</h2>
        <p>
          John Bowlby entwickelte in den 1960er Jahren die Bindungstheorie: Die These, dass Menschen
          ein biologisch verankertes Bedürfnis nach enger emotionaler Verbindung haben – besonders
          in früher Kindheit. Wenn dieses Bedürfnis verlässlich befriedigt wird, entsteht <em>sichere
          Bindung</em>. Wenn nicht, entwickeln Kinder Strategien, um mit dem Mangel umzugehen.
        </p>
        <p>
          Mary Ainsworth verfeinerte das Konzept durch ihre „Fremde Situation"-Experimente und
          identifizierte zunächst drei Bindungsstile. Später wurde ein vierter ergänzt.
        </p>

        <h2>Die vier Bindungsstile</h2>

        <h3>Sicher (secure)</h3>
        <p>
          Sicher gebundene Menschen fühlen sich in Beziehungen wohl – sowohl mit Nähe als auch mit
          Autonomie. Sie können Bedürfnisse direkt äußern, vertragen Konflikte und kehren nach
          Streit wieder zu Verbundenheit zurück. Als Kinder hatten sie verlässliche Bezugspersonen,
          die auf ihre Signale eingegangen sind.
        </p>
        <p>
          Als Erwachsene: vertrauen ohne Klammern, fordern ohne Ultimaten, streiten ohne Katastrophe.
        </p>

        <h3>Ängstlich-ambivalent (anxious-preoccupied)</h3>
        <p>
          Dieser Stil entsteht, wenn Bezugspersonen unberechenbar waren – manchmal fürsorglich,
          manchmal nicht. Das Kind lernte: Bindung muss aktiv erhalten werden, sie ist nicht selbstverständlich.
        </p>
        <p>
          Als Erwachsene: starkes Bedürfnis nach Bestätigung, Angst vor Verlassenwerden, Überinterpretation
          von Signalen (eine Nachricht ohne Antwort = Ablehnung). Nähe ist dringend gewollt, aber
          auch nie ganz sicher.
        </p>

        <h3>Vermeidend-distanziert (dismissive-avoidant)</h3>
        <p>
          Entsteht, wenn emotionale Bedürfnisse konsequent abgelehnt oder ignoriert wurden.
          Das Kind lernte: Bedürftigkeit bringt nichts, besser auf sich selbst verlassen.
        </p>
        <p>
          Als Erwachsene: starke Selbstständigkeit, Unbehagen bei zu viel Nähe, Rückzug wenn
          Beziehungen zu intensiv werden. Gefühle werden kleingemacht oder abgespalten.
          Nicht Kälte – sondern erlernte Schutzstrategie.
        </p>

        <h3>Desorganisiert (fearful-avoidant)</h3>
        <p>
          Tritt auf, wenn die Bezugsperson zugleich Quelle von Sicherheit und Bedrohung war
          (z. B. bei Vernachlässigung oder Misshandlung). Das System hat keinen kohärenten
          Lösungsweg gefunden.
        </p>
        <p>
          Als Erwachsene: gleichzeitig Sehnsucht nach Nähe und Angst davor. Wechsel zwischen
          Anklammern und plötzlichem Rückzug. Oft stark traumaassoziiert.
        </p>

        <blockquote>
          Bindungsstile sind keine Persönlichkeitsdiagnosen. Sie beschreiben erlernte Strategien –
          nicht das, was jemand „ist".
        </blockquote>

        <h2>Bindungsstile in der Erwachsenenbeziehung</h2>
        <p>
          Bindungsstile interagieren. Ein klassisches Muster: ein ängstlicher und ein vermeidender
          Bindungsstil in einer Beziehung. Der ängstliche Teil sucht mehr Nähe – was den vermeidenden
          Teil unter Druck setzt, der sich zurückzieht – was die Angst des anderen erhöht –
          was den Rückzug verstärkt. Eine sich selbst verstärkende Schleife.
        </p>
        <p>
          Beide leiden darunter. Keiner ist „schuld".
        </p>

        <h2>Können sich Bindungsstile verändern?</h2>
        <p>
          Ja. Bindungsstile sind keine unveränderliche Prägung. Sichere Beziehungen – auch therapeutische –
          können over Zeit zu einem sichereren Bindungsmuster führen. Das nennt man <em>earned security</em>:
          erarbeitete Sicherheit durch neue Bindungserfahrungen.
        </p>
        <p>
          Das geht nicht über Nacht. Aber die Erkenntnis über den eigenen Stil ist oft der erste Schritt.
        </p>
      </BlogArticleLayout>
    </PageLayout>
  )
}
