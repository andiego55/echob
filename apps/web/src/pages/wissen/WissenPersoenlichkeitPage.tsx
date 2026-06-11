import PageLayout from '@/components/layout/PageLayout'
import BlogArticleLayout from '@/components/layout/BlogArticleLayout'

export default function WissenPersoenlichkeitPage() {
  return (
    <PageLayout>
      <BlogArticleLayout
        tag="Psychologisches Wissen"
        title="Persönlichkeit & Verhalten"
        subtitle="Was Persönlichkeitsmerkmale sind – und was nicht · 9 Min. Lesezeit"
        backLink="/wissen"
        backLabel="Zurück zum Wissen"
        echoLink="/app?wissen=persoenlichkeit"
        echoTitle="Muster im Verhalten anderer verstehen"
        echoText="Echo hilft dir, konkrete Verhaltensweisen zu beschreiben und zu sortieren – ohne andere zu diagnostizieren."
        echoCta="Situation mit Echo besprechen →"
        echoSteps={['Anmelden oder Konto erstellen', 'Fall anlegen und Szene beschreiben', 'Echo-Dialog starten']}
      >
        <p>
          Wenn jemand verletzt, kontrolliert oder manipuliert, suchen wir nach Erklärungen.
          Diagnosen aus dem Internet – Narzissmus, Borderline, Psychopathie – fühlen sich manchmal
          wie ein Aufatmen an: Endlich einen Namen für das, was passiert. Aber sie können auch
          in die Irre führen, wenn sie zum Schlüssel für jede Tür werden.
        </p>

        <h2>Was Persönlichkeit ist</h2>
        <p>
          Persönlichkeit bezeichnet stabile Muster im Denken, Fühlen und Verhalten – wie jemand
          grundsätzlich auf die Welt reagiert. Sie ist das Ergebnis von Genetik, frühen Erfahrungen
          und Umwelt, und sie verändert sich über das Leben hinweg, aber langsam.
        </p>
        <p>
          Das bekannteste wissenschaftliche Modell sind die <strong>Big Five</strong> – fünf
          Dimensionen, auf denen jeder Mensch irgendwo verortet ist:
        </p>
        <ul>
          <li><strong>Offenheit:</strong> Neugier, Fantasie, Experimentierfreude</li>
          <li><strong>Gewissenhaftigkeit:</strong> Ordnung, Zuverlässigkeit, Disziplin</li>
          <li><strong>Extraversion:</strong> Geselligkeit, Energie im Kontakt mit anderen</li>
          <li><strong>Verträglichkeit:</strong> Empathie, Kooperationsbereitschaft, Vertrauen</li>
          <li><strong>Neurotizismus:</strong> Emotionale Reaktivität, Anfälligkeit für Stress</li>
        </ul>
        <p>
          Kein Profil ist gut oder schlecht. Extreme Ausprägungen auf einer Dimension können im
          Beziehungskontext jedoch zu Reibung führen – besonders wenn sie auf entgegengesetzte
          Profile treffen.
        </p>

        <h2>Persönlichkeitsstile vs. -störungen</h2>
        <p>
          Persönlichkeitsstörungen sind klinische Diagnosen – sie erfordern professionelle
          Beurteilung über Zeit und Kontext. Was Laien als „Narzissmus" bezeichnen, ist oft
          ein Persönlichkeitsstil: eine konsistente Art zu agieren, die andere belastet, aber
          keine klinisch relevante Störung sein muss.
        </p>
        <p>
          Die Unterscheidung ist wichtig: wer eine andere Person diagnostiziert, erklärt damit
          meist das eigene Leid – nicht das Innenleben der anderen Person. Das ist menschlich,
          aber kann den Blick auf das eigene Erleben einengen.
        </p>

        <h2>Narzissmus verstehen – ohne Schubladen</h2>
        <p>
          Narzissmus als Eigenschaft (nicht als Diagnose) liegt auf einem Spektrum.
          Mäßiger Narzissmus – Selbstsicherheit, Leistungsorientierung, Wunsch nach Bewunderung –
          ist allgegenwärtig. Problematisch wird es, wenn Empathiemangel mit Kontrolle, Entwertung
          und Unfähigkeit zur Fehlerübernahme zusammenkommt.
        </p>
        <p>
          Verhalten, das häufig beschrieben wird: Idealisierungsphasen gefolgt von Entwertung,
          starke Reaktion auf wahrgenommene Kritik (<em>narcissistic injury</em>), Schwierigkeit,
          Verantwortung zu übernehmen, Umschreiben der Geschichte im Nachhinein.
        </p>

        <h2>Das Dunkle Dreieck</h2>
        <p>
          In der Persönlichkeitspsychologie beschreibt das <em>Dark Triad</em> drei Eigenschaften,
          die gemeinsam auftreten können: Narzissmus, Machiavellismus (strategische Manipulation)
          und Psychopathie (geringe Empathie und Impulsivität). Auch diese liegen auf Spektren.
        </p>
        <p>
          Wichtig: Das Vorhandensein dieser Eigenschaften sagt nichts über die Ursache aus –
          und nichts darüber, ob Veränderung möglich ist. Manche Menschen mit ausgeprägten
          Persönlichkeitsstilen arbeiten erfolgreich in Therapie. Andere nicht.
        </p>

        <blockquote>
          Das Ziel ist nicht, jemanden zu diagnostizieren. Das Ziel ist, das eigene Erleben
          besser einzuordnen – und dann zu entscheiden, was das bedeutet.
        </blockquote>

        <h2>Was das für dich bedeutet</h2>
        <p>
          Wer das Verhalten einer anderen Person versteht, kann eigene Reaktionen besser einordnen.
          Aber Verstehen ist keine Entschuldigung – und keine Lösung. Der nächste Schritt
          (Gespräch suchen, Grenzen setzen, Abstand nehmen, professionelle Hilfe) hängt von
          der konkreten Situation ab, nicht von einer Diagnose.
        </p>
      </BlogArticleLayout>
    </PageLayout>
  )
}
