import PageLayout from '@/components/layout/PageLayout'
import BlogArticleLayout from '@/components/layout/BlogArticleLayout'

export default function WissenGrenzenPage() {
  return (
    <PageLayout>
      <BlogArticleLayout
        tag="Selbstreflexion"
        title="Grenzen setzen"
        subtitle="Was Grenzen wirklich sind – und warum sie so schwer zu setzen sind · 8 Min. Lesezeit"
        backLink="/wissen"
        backLabel="Zurück zum Wissen"
        echoLink="/app?wissen=grenzen"
        echoTitle="Erkenne, wo deine Grenzen liegen"
        echoText="Echo hilft dir, konkrete Situationen zu beschreiben, in denen du gespürt hast, dass eine Grenze überschritten wurde – und was das bei dir ausgelöst hat."
        echoCta="Situation mit Echo reflektieren →"
        echoSteps={['Anmelden oder Konto erstellen', 'Fall anlegen und Szene beschreiben', 'Echo-Dialog starten']}
      >
        <p>
          „Du musst einfach Grenzen setzen" – das klingt einfach. Wer es versucht hat, weiß,
          dass es das nicht ist. Grenzen setzen ist eine Kompetenz, die gelernt werden muss –
          und die in vielen Kontexten aktiv erschwert wird.
        </p>

        <h2>Was eine Grenze ist – und was nicht</h2>
        <p>
          Eine Grenze ist kein Angriff und kein Ultimatum. Sie ist eine Aussage über das eigene
          Erleben und die eigene Bereitschaft: <em>Was kann ich? Was bin ich bereit, zu tragen?
          Was brauche ich, um in Kontakt bleiben zu können?</em>
        </p>
        <p>
          Grenzen betreffen immer das eigene Verhalten – nicht das der anderen Person.
          „Du darfst mich nicht so ansprechen" ist kein Limit, das man setzen kann (man kann
          andere nicht kontrollieren). „Wenn du mich so ansprichst, beende ich das Gespräch"
          ist eine Grenze – weil sie das eigene Handeln beschreibt.
        </p>

        <h2>Warum Grenzen so schwer zu setzen sind</h2>
        <p>
          Grenzen sind schwer aus mehreren Gründen:
        </p>
        <ul>
          <li>
            <strong>Gelernte Hilflosigkeit:</strong> Wer früh erfahren hat, dass Nein-Sagen
            Konsequenzen hat (Wutausbrüche, Liebesentzug, Bestrafung), hat Grenzen als
            gefährlich erlebt. Das Nervensystem erinnert sich.
          </li>
          <li>
            <strong>Schuldgefühle:</strong> Viele Menschen fühlen sich schuldig, wenn sie
            Bedürfnisse der anderen Person nicht erfüllen. Dieses Schuldgefühl wird manchmal
            aktiv erzeugt oder verstärkt.
          </li>
          <li>
            <strong>Angst vor Beziehungsverlust:</strong> Wer eine Grenze setzt, riskiert
            Widerstand oder Distanz – was in Abhängigkeitsdynamiken existenziell bedrohlich
            wirken kann.
          </li>
          <li>
            <strong>Unklarheit über das eigene Erleben:</strong> Manchmal weiß man nicht genau,
            was man braucht – weil man gelernt hat, das eigene Erleben kleinzumachen.
          </li>
        </ul>

        <h2>Schuldgefühle als Werkzeug</h2>
        <p>
          In manchen Beziehungen werden Schuldgefühle aktiv eingesetzt: Das Setzen einer Grenze
          löst in der anderen Person eine starke Reaktion aus (Tränen, Wut, Schweigen, Vorwürfe),
          die die grenzensetzende Person dazu bringt, die Grenze zurückzunehmen.
        </p>
        <p>
          Das ist kein Beweis, dass die Grenze falsch war. Es ist ein Hinweis auf die Dynamik
          der Beziehung.
        </p>

        <blockquote>
          Eine Grenze ist kein Akt der Feindseligkeit. Sie ist oft der einzige Weg, in einer
          Beziehung zu bleiben, ohne sich selbst aufzugeben.
        </blockquote>

        <h2>Wie Grenzen kommuniziert werden</h2>
        <p>
          Klar, direkt, ohne Entschuldigung:
        </p>
        <ul>
          <li>Beschreibe das konkrete Verhalten, nicht den Charakter. Nicht: „Du bist immer so."</li>
          <li>Beschreibe dein Erleben: „Ich fühle mich überfordert, wenn..."</li>
          <li>Beschreibe, was du brauchst oder tun wirst: „Ich brauche...", „Ich werde..."</li>
          <li>Setze die Konsequenz um – sonst ist es keine Grenze, sondern ein Wunsch.</li>
        </ul>
        <p>
          Grenzen müssen nicht verhandelt werden. Erklärungen können helfen – sind aber keine
          Pflicht. Wer auf jede Grenze eine ausführliche Rechtfertigung erwartet, übt damit
          selbst Druck aus.
        </p>

        <h2>Wenn Grenzen konsequent ignoriert werden</h2>
        <p>
          Wenn gesetzt Grenzen wiederholt nicht respektiert werden, ist das eine wichtige
          Information über die Beziehungsdynamik. Es bedeutet nicht automatisch, dass man
          die Beziehung beenden muss – aber es bedeutet, dass das Problem größer ist als
          die Kommunikation allein.
        </p>
        <p>
          In solchen Situationen kann professionelle Begleitung (Paartherapie, Beratung,
          Einzeltherapie) helfen, den nächsten Schritt zu finden.
        </p>
      </BlogArticleLayout>
    </PageLayout>
  )
}
