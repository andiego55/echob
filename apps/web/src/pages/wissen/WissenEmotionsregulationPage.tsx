import PageLayout from '@/components/layout/PageLayout'
import BlogArticleLayout from '@/components/layout/BlogArticleLayout'

export default function WissenEmotionsregulationPage() {
  return (
    <PageLayout>
      <BlogArticleLayout
        tag="Psychologisches Wissen"
        title="Emotionsregulation"
        subtitle="Warum manche Menschen Gefühle schwer regulieren können – und wie das Umfeld darunter leidet · 8 Min. Lesezeit"
        backLink="/wissen"
        backLabel="Zurück zum Wissen"
        echoLink="/app?wissen=emotionsregulation"
        echoTitle="Erkenne emotionale Muster in deiner Situation"
        echoText="Echo hilft dir, konkrete Situationen zu beschreiben – inklusive der emotionalen Dynamik, die dabei sichtbar wird."
        echoCta="Situation mit Echo reflektieren →"
        echoSteps={['Anmelden oder Konto erstellen', 'Fall anlegen und Szene beschreiben', 'Echo-Dialog starten']}
      >
        <p>
          Jeder Mensch reguliert Gefühle – mal besser, mal schlechter. Bei manchen Menschen jedoch
          ist die Regulation so eingeschränkt, dass sie selbst und ihr Umfeld dauerhaft darunter
          leiden. Das Verständnis dieser Mechanismen erklärt viel – ohne das Verhalten zu entschuldigen.
        </p>

        <h2>Was Emotionsregulation bedeutet</h2>
        <p>
          Emotionsregulation umfasst alle Prozesse, mit denen Menschen ihre emotionalen Reaktionen
          beeinflussen: wann eine Emotion entsteht, wie stark sie wird, wie lange sie anhält und
          wie sie sich in Verhalten niederschlägt.
        </p>
        <p>
          Gut funktionierende Regulation bedeutet nicht Emotionslosigkeit – sondern die Fähigkeit,
          Gefühle zu erleben, ohne von ihnen überwältigt zu werden oder automatisch zu reagieren.
        </p>

        <h2>Das Toleranzfenster</h2>
        <p>
          Der Neurowissenschaftler Dan Siegel prägte den Begriff des <em>Toleranzfensters</em>
          (window of tolerance): der Bereich emotionaler Aktivierung, in dem ein Mensch noch
          denken, reflektieren und kommunizieren kann.
        </p>
        <ul>
          <li>
            <strong>Hyperarousal</strong> (Übererregung): Panik, Wut, Kontrollverlust, Impulsivität.
            Das Nervensystem ist überflutet.
          </li>
          <li>
            <strong>Hypoarousal</strong> (Untererregung): Taubheit, Rückzug, Dissoziation, emotionale Abschaltung.
            Das Nervensystem fährt herunter.
          </li>
        </ul>
        <p>
          Außerhalb des Toleranzfensters – oben oder unten – ist konstruktive Kommunikation
          kaum möglich. Wer in diesem Zustand ist, reagiert aus dem Überlebensmodus, nicht aus
          dem Beziehungsmodus.
        </p>

        <h2>Trauma und Dysregulation</h2>
        <p>
          Chronische oder frühe Traumata verengen das Toleranzfenster. Das Nervensystem ist
          darauf trainiert, Bedrohungen schnell zu erkennen und schnell zu reagieren –
          auch wenn die aktuelle Situation gar keine echte Bedrohung darstellt.
        </p>
        <p>
          Ein laut gesprochenes Wort, ein bestimmter Tonfall, ein Blick – das sind Trigger,
          die das System in Sekundenbruchteilen aus dem Toleranzfenster katapultieren.
          Die Reaktion ist dann nicht proportional zur aktuellen Situation, sondern zur
          gespeicherten Erfahrung.
        </p>

        <h2>Wie Dysregulation Beziehungen beeinflusst</h2>
        <p>
          Wenn ein Mensch häufig dysreguliert ist, hat das Auswirkungen auf alle engen
          Beziehungen:
        </p>
        <ul>
          <li>Andere lernen, auf Stimmungsschwankungen zu achten und ihr Verhalten anzupassen.</li>
          <li>Konflikte eskalieren schneller und unvorhersehbarer.</li>
          <li>Versöhnungen sind oft intensiv, aber das Problem bleibt ungelöst.</li>
          <li>Das Umfeld übernimmt zunehmend emotionale Regulationsarbeit für die andere Person.</li>
        </ul>
        <p>
          Das letzte Phänomen – wenn eine Person die Gefühle einer anderen mitreguliert –
          nennt sich <em>Co-Regulation</em>. In gesunden Dosen ist das normal (Eltern-Kind,
          enge Freundschaften). Wenn es zur dauerhaften einseitigen Last wird, erschöpft es.
        </p>

        <blockquote>
          Emotionale Dysregulation ist häufig keine Entscheidung, sondern eine Folge früher
          Erfahrungen. Das erklärt das Verhalten – aber rechtfertigt es nicht.
        </blockquote>

        <h2>Was helfen kann</h2>
        <p>
          Für Menschen mit deutlichen Dysregulationsmustern ist Psychotherapie – besonders
          DBT (Dialektisch-Behaviorale Therapie) oder traumafokussierte Ansätze – der
          wirkungsvollste Weg. Diese Therapieformen helfen, das Toleranzfenster zu erweitern
          und neue Strategien zu entwickeln.
        </p>
        <p>
          Für das Umfeld: Die eigene Belastbarkeit hat Grenzen. Verstehen ist kein Freibrief,
          unbegrenzt Kapazität bereitzustellen. Auch das ist wichtig zu benennen.
        </p>
      </BlogArticleLayout>
    </PageLayout>
  )
}
