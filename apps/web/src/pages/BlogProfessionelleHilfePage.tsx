import PageLayout from '@/components/layout/PageLayout'
import BlogArticleLayout from '@/components/layout/BlogArticleLayout'

export default function BlogProfessionelleHilfePage() {
  return (
    <PageLayout>
      <BlogArticleLayout
        tag="Hilfe finden"
        title="Wann professionelle Hilfe sinnvoll ist"
        subtitle="Orientierung, wann der nächste sinnvolle Schritt ein Gespräch mit Therapeut:innen oder Berater:innen sein kann · 7 Min. Lesezeit"
        echoLink="/app?blog=blog_professionelle_hilfe"
        echoTitle="Deine Situation besser einordnen"
        echoText="Bevor du einen Schritt machst, kann es helfen, deine Situation zu strukturieren. Echo hilft dir dabei – als Vorbereitung für ein erstes Gespräch mit einer Fachperson."
        echoCta="Situation mit Echo strukturieren →"
        echoSteps={['Anmelden oder Konto erstellen', 'Fall und Szenen anlegen', 'Bericht als Gesprächsgrundlage erstellen']}
      >
        <p>
          Wann ist eine Beziehungssituation „schlimm genug" für professionelle Hilfe? Diese Frage stellen
          sich viele Menschen – und beantworten sie im Zweifel mit „noch nicht". Dabei hat professionelle
          Unterstützung keine Eintrittshürde in Form von Leid. Sie ist ein Werkzeug, kein letzter Ausweg.
        </p>

        <h2>Signale, die für professionelle Begleitung sprechen</h2>
        <p>
          Es gibt keine absolute Schwelle. Aber einige Muster deuten darauf hin, dass das Gespräch mit
          einer Fachperson sinnvoll wäre:
        </p>
        <ul>
          <li>Du kreist gedanklich immer wieder um dieselbe Situation – ohne weiterzukommen.</li>
          <li>Dein Alltag, dein Schlaf oder deine Arbeit sind dauerhaft beeinträchtigt.</li>
          <li>Du hast das Gefühl, nicht mehr zu wissen, was du wahrnehmen kannst und was nicht.</li>
          <li>Gespräche mit Freund:innen helfen kurzfristig, aber lösen nichts.</li>
          <li>Du fragst dich, ob deine eigene Wahrnehmung „richtig" ist.</li>
          <li>Du überlegst, ob eine Beziehung für dich gefährlich sein könnte.</li>
        </ul>

        <h2>Was unterschiedliche Hilfsformen leisten</h2>
        <p>
          Nicht alle professionellen Angebote sind gleich. Ein grober Überblick:
        </p>
        <ul>
          <li>
            <strong>Psychotherapie</strong> arbeitet längerfristig an Mustern, Lebensgeschichte und
            psychischen Beschwerden. Setzt Diagnose voraus (in vielen Systemen). Oft lange Wartezeiten.
          </li>
          <li>
            <strong>Psychologische Beratung</strong> ist niedrigschwelliger, kürzer, meist lösungs- oder
            situationsorientiert. Kein Kassenangebot, aber häufig über freie Beratungsstellen zugänglich.
          </li>
          <li>
            <strong>Coaching</strong> richtet sich an Menschen ohne klinisches Beschwerdebild. Fokus auf
            Ziele, Ressourcen und Veränderung. Nicht staatlich reguliert – Qualität variiert stark.
          </li>
          <li>
            <strong>Beratungsstellen</strong> (z. B. Caritas, AWO, Frauenhäuser) bieten häufig kostenlose
            Erstgespräche an – anonym, ohne Diagnose, oft sofort erreichbar.
          </li>
        </ul>

        <h2>Die Hürde überwinden</h2>
        <p>
          Das größte Hindernis ist oft die Überzeugung, das Problem sei nicht „ernst genug". Oder:
          Hilfe zu suchen sei eine Schwäche. Beides stimmt nicht. Professionelle Hilfe ist nicht für
          Menschen, die am Ende sind – sie ist für Menschen, die weiterkommen wollen.
        </p>
        <p>
          Ein Erstgespräch verpflichtet zu nichts. Viele Stellen bieten kostenlose Orientierungsgespräche an.
          Es geht nicht darum, sofort die „richtige" Fachperson zu finden – sondern erst einmal anzufangen.
        </p>

        <blockquote>
          Professionelle Hilfe ist kein letzter Ausweg. Sie ist ein Werkzeug –
          und es ist nicht notwendig, erst am Ende zu sein, um sie zu nutzen.
        </blockquote>

        <h2>Praktische erste Schritte</h2>
        <ul>
          <li>Suche nach Beratungsstellen in deiner Stadt (z. B. über <em>beratungsstellen.de</em>).</li>
          <li>Frage deinen Hausarzt / deine Hausärztin nach einer Überweisung oder Empfehlung.</li>
          <li>Wende dich an die Telefonseelsorge (<strong>0800 111 0 111</strong>) für ein erstes Orientierungsgespräch.</li>
          <li>Nutze EchoB, um deine Situation zu strukturieren – als Vorbereitung für ein Erstgespräch.</li>
        </ul>

        <h2>Was EchoB hier leisten kann</h2>
        <p>
          EchoB ersetzt keine Therapie. Aber es kann dabei helfen, das, was du erlebt hast, zu sortieren –
          bevor du in ein Erstgespräch gehst. Ein EchoB-Bericht kann eine Gesprächsgrundlage sein.
          Er zeigt: Was habe ich erlebt? Was wiederholt sich? Wo bin ich gerade?
        </p>
      </BlogArticleLayout>
    </PageLayout>
  )
}
