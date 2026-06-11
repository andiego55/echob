import PageLayout from '@/components/layout/PageLayout'
import BlogArticleLayout from '@/components/layout/BlogArticleLayout'

export default function BlogBeziehungsmusterPage() {
  return (
    <PageLayout>
      <BlogArticleLayout
        tag="Beziehungsdynamiken"
        title="Beziehungsmuster erkennen"
        subtitle="Was sind wiederkehrende Dynamiken, und wie entstehen sie? · 8 Min. Lesezeit"
        echoLink="/app?blog=blog_beziehungsmuster"
        echoTitle="Erkenne Muster in deiner eigenen Beziehung"
        echoText="Was du gerade gelesen hast, kannst du jetzt auf deinen eigenen Fall anwenden. Echo begleitet dich durch einen geführten Dialog – mit dem Kontext deiner dokumentierten Situationen."
        echoCta="Mit Echo über Beziehungsmuster sprechen →"
        echoSteps={['Anmelden oder Konto erstellen', 'Einen deiner Fälle auswählen', 'Dialog über Beziehungsmuster starten']}
      >
        <p>
          Viele Menschen, die sich in belastenden Beziehungen befinden, berichten von einem merkwürdigen Gefühl:
          Sie wissen, wie die nächste Auseinandersetzung verlaufen wird, bevor sie beginnt. Sie kennen das
          Drehbuch auswendig – und spielen trotzdem ihre Rolle. Dieses Phänomen nennt man{' '}
          <strong>Beziehungsmuster</strong>.
        </p>

        <h2>Was ist ein Beziehungsmuster?</h2>
        <p>
          Ein Beziehungsmuster ist eine wiederkehrende Abfolge von Verhaltensweisen, Reaktionen und Emotionen,
          die sich in einer Beziehung immer wieder zeigt. Es ist kein Zufall, sondern ein eingespieltes System –
          oft unbewusst, manchmal jahrelang eingeübt.
        </p>
        <p>Typische Muster sind etwa:</p>
        <ul>
          <li><strong>Nähe-Distanz-Zyklen:</strong> Intensive Verbundenheit wechselt mit plötzlichem Rückzug. Eine Person nähert sich an, die andere weicht aus – und umgekehrt.</li>
          <li><strong>Eskalations-Versöhnungs-Schleifen:</strong> Auf einen heftigen Konflikt folgt eine Phase überschwänglicher Zuneigung. Der Konflikt wird nie wirklich gelöst.</li>
          <li><strong>Verantwortungsverschiebung:</strong> Eine Person übernimmt konsequent mehr Verantwortung und Schuld, die andere konsequent weniger.</li>
          <li><strong>Idealisierung und Entwertung:</strong> Eine Person wird zunächst als perfekt erlebt, dann plötzlich abgewertet – oft ohne erkennbaren Anlass.</li>
        </ul>

        <h2>Wie entstehen Muster?</h2>
        <p>
          Beziehungsmuster entstehen nicht über Nacht. Sie sind das Ergebnis von Lernprozessen – häufig weit
          vor der aktuellen Beziehung. Frühe Bindungserfahrungen, also wie wir als Kind mit engen Bezugspersonen
          umgegangen sind, prägen grundlegende Erwartungen: Ist Nähe sicher? Wird Bedürftigkeit bestraft? Muss
          ich kämpfen, um gesehen zu werden?
        </p>
        <p>
          Diese inneren Überzeugungen – die man auch <em>Schemata</em> nennt – aktivieren sich in engen
          Beziehungen automatisch. Wenn ein aktuelles Verhalten an alte Verletzungen erinnert, reagiert das
          Nervensystem, als ob die alte Situation noch andauert.
        </p>

        <blockquote>
          „Ein Muster ist keine Fehlfunktion. Es war einmal die beste verfügbare Antwort auf eine schwierige Situation."
        </blockquote>

        <h2>Muster erkennen – aber ohne Schubladen</h2>
        <p>
          Es ist verlockend, Muster als Beweis für eine bestimmte „Diagnose" zu lesen. Das ist nicht sinnvoll –
          und meistens auch nicht hilfreich. Muster sind Verhaltensbeschreibungen, keine Charakterurteile.
          Auch die eigenen.
        </p>
        <p>
          Eine nützlichere Frage lautet: <em>Was passiert hier immer wieder? Und was löst es bei mir aus?</em>{' '}
          Wer ein Muster erst einmal benennen kann, hat bereits etwas Entscheidendes gewonnen: einen Abstand
          zur automatischen Reaktion.
        </p>

        <h2>Was EchoB dabei helfen kann</h2>
        <p>
          EchoB ist darauf ausgelegt, genau diese Muster sichtbar zu machen. Du beschreibst konkrete Szenen –
          und die App hilft dir, zu erkennen, was sich darin wiederholt. Nicht als Diagnose, sondern als Spiegel.
        </p>
        <p>
          Das allein löst kein Problem. Aber es schafft die Voraussetzung dafür, überhaupt anders reagieren zu können.
        </p>
      </BlogArticleLayout>
    </PageLayout>
  )
}
