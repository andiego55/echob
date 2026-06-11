import PageLayout from '@/components/layout/PageLayout'
import BlogArticleLayout from '@/components/layout/BlogArticleLayout'

export default function WissenBeobachtungPage() {
  return (
    <PageLayout>
      <BlogArticleLayout
        tag="Selbstreflexion"
        title="Beobachtung, Gefühl, Interpretation"
        subtitle="Wie du lernst, zwischen dem was passiert ist, dem was du fühlst, und dem was du daraus schließt, zu unterscheiden · 6 Min. Lesezeit"
        backLink="/wissen"
        backLabel="Zurück zum Wissen"
        echoLink="/app?wissen=beobachtung"
        echoTitle="Trenne Beobachtung von Interpretation in deiner Situation"
        echoText="Echo hilft dir, konkrete Situationen aus deiner Beziehung durchzugehen – und dabei zu unterscheiden, was du gesehen hast, was du gefühlt hast, und was du interpretiert hast."
        echoCta="Situation mit Echo analysieren →"
        echoSteps={['Anmelden oder Konto erstellen', 'Einen Fall anlegen und Szene beschreiben', 'Echo-Dialog starten']}
      >
        <p>
          „Er meinte es nicht ernst." „Sie will mich kontrollieren." „Das tut er absichtlich." –
          Solche Gedanken entstehen blitzschnell und fühlen sich wie Fakten an. Tatsächlich sind sie
          Interpretationen. Der Unterschied zwischen dem, was <em>wirklich passiert ist</em>, und dem,
          was wir <em>daraus machen</em>, ist einer der zentralen Hebel für Selbstreflexion.
        </p>

        <h2>Drei Ebenen im Überblick</h2>
        <p>
          Die Gewaltfreie Kommunikation (GFK) nach Marshall Rosenberg unterscheidet systematisch zwischen
          drei Ebenen, die wir im Alltag oft vermischen:
        </p>
        <ul>
          <li>
            <strong>Beobachtung:</strong> Was hat konkret stattgefunden? Was wurde gesagt oder getan –
            so sachlich wie eine Kamera es aufzeichnen würde?
          </li>
          <li>
            <strong>Gefühl:</strong> Was hat das in mir ausgelöst? Was spüre ich – in meinem Körper,
            in meiner Stimmung?
          </li>
          <li>
            <strong>Interpretation / Bewertung:</strong> Was schließe ich daraus? Was bedeutet das über
            die andere Person, über mich, über unsere Beziehung?
          </li>
        </ul>

        <h2>Warum die Vermischung problematisch ist</h2>
        <p>
          Wenn Interpretation als Tatsache behandelt wird, entstehen Gespräche, die sich schnell im Kreis
          drehen. „Du willst mich nicht" klingt wie eine Beobachtung, ist aber eine Deutung. Die andere
          Person widerspricht – und schon sind wir nicht mehr beim Verhalten, sondern bei Absichten,
          die niemand beweisen oder widerlegen kann.
        </p>

        <h2>Das konkrete Werkzeug</h2>
        <p>
          Eine einfache Übung: Schreibe eine belastende Situation auf. Dann markiere jeden Satz mit
          einem von drei Tags:
        </p>
        <ul>
          <li><strong>[B]</strong> – Beobachtung (was genau passiert ist)</li>
          <li><strong>[G]</strong> – Gefühl (was du gespürt hast)</li>
          <li><strong>[I]</strong> – Interpretation (was du daraus schlosst)</li>
        </ul>
        <p>
          Meistens dominiert [I]. Das ist normal – unser Gehirn ist Bedeutungsmaschine. Aber wenn wir
          merken, dass wir interpretieren, können wir auch fragen: <em>Was wäre eine andere mögliche
          Erklärung?</em>
        </p>

        <blockquote>
          „Beobachtungen ohne Bewertungen sind die höchste Form menschlicher Intelligenz."
          <br /><em>– Jiddu Krishnamurti, zitiert von Marshall Rosenberg</em>
        </blockquote>

        <h2>Grenzen des Werkzeugs</h2>
        <p>
          Diese Trennung hilft, klarer zu denken. Sie löst keine Konflikte. Und sie rechtfertigt kein
          Verhalten – auch klar beobachtetes Fehlverhalten ist Fehlverhalten. Das Ziel ist nicht,
          alles zu relativieren, sondern sicherer zu urteilen.
        </p>
      </BlogArticleLayout>
    </PageLayout>
  )
}
