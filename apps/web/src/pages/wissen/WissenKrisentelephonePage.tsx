import PageLayout from '@/components/layout/PageLayout'
import BlogArticleLayout from '@/components/layout/BlogArticleLayout'

export default function WissenKrisentelephonePage() {
  return (
    <PageLayout>
      <BlogArticleLayout
        tag="Hilfe finden"
        title="Krisentelefone & Anlaufstellen"
        subtitle="Kostenlose Hilfsangebote in Deutschland, Österreich und der Schweiz · 4 Min. Lesezeit"
        backLink="/wissen"
        backLabel="Zurück zum Wissen"
        echoLink="/app?wissen=krisentelefone"
        echoTitle="Wenn du gerade Abstand brauchst"
        echoText="Wenn du nicht direkt sprechen möchtest, aber trotzdem etwas sortieren willst – Echo kann dir helfen, deine Gedanken zu strukturieren."
        echoCta="Mit Echo reflektieren →"
        echoSteps={['Anmelden oder Konto erstellen', 'Neue Szene beschreiben', 'Echo-Dialog starten']}
      >
        <div className="rounded-brand border border-red-200 bg-red-50 px-5 py-4 mb-8">
          <p className="text-sm text-red-800 font-semibold">
            Bei akuter Lebensgefahr: Notruf <strong>112</strong> oder <strong>110</strong>.
            Diese Seite ist kein Notfalldienst.
          </p>
        </div>

        <p>
          In Krisensituationen ist Hilfe oft näher als gedacht – kostenlos, anonym, rund um die Uhr.
          Die folgenden Anlaufstellen sind für Menschen, die gerade nicht wissen, wo sie anfangen sollen,
          oder die einfach mit jemandem sprechen müssen.
        </p>

        <h2>Deutschland</h2>

        <h3>Telefonseelsorge</h3>
        <ul>
          <li><strong>0800 111 0 111</strong> – kostenlos, 24/7, anonym</li>
          <li><strong>0800 111 0 222</strong> – kostenlos, 24/7, anonym</li>
          <li>Online: telefonseelsorge.de</li>
        </ul>

        <h3>Hilfetelefon Gewalt gegen Frauen</h3>
        <ul>
          <li><strong>08000 116 016</strong> – kostenlos, 24/7, in 17 Sprachen</li>
          <li>Auch per Chat und E-Mail: hilfetelefon.de</li>
        </ul>

        <h3>Nummer gegen Kummer</h3>
        <ul>
          <li><strong>116 111</strong> – kostenlos, Mo–Sa 14–20 Uhr, für Kinder & Jugendliche</li>
        </ul>

        <h3>Weißer Ring (Opfer von Straftaten)</h3>
        <ul>
          <li><strong>116 006</strong> – kostenlos, Mo–So 7–22 Uhr</li>
        </ul>

        <h3>Hilfetelefon Sexueller Missbrauch</h3>
        <ul>
          <li><strong>0800 22 55 530</strong> – kostenlos, Mo–Sa 9–21 Uhr</li>
        </ul>

        <h2>Österreich</h2>
        <ul>
          <li><strong>142</strong> – Telefonseelsorge Austria, kostenlos, 24/7</li>
          <li><strong>0800 222 555</strong> – Frauenhelpline gegen Gewalt, kostenlos, 24/7</li>
          <li><strong>147</strong> – Rat auf Draht (Kinder & Jugendliche), 24/7</li>
          <li><strong>0800 700 217</strong> – Männernotruf, kostenlos</li>
        </ul>

        <h2>Schweiz</h2>
        <ul>
          <li><strong>143</strong> – Die Dargebotene Hand, kostenlos, 24/7</li>
          <li><strong>147</strong> – Pro Juventute (Kinder & Jugendliche), 24/7</li>
          <li><strong>0800 040 040</strong> – Häusliche Gewalt Hilfetelefon, kostenlos</li>
        </ul>

        <h2>Hinweis zur Nutzung</h2>
        <p>
          Diese Nummern sind niedrigschwellig: Du musst nichts erklären, nichts beweisen und dich zu
          nichts verpflichten. Ein Erstgespräch verpflichtet zu gar nichts.
        </p>
        <p>
          EchoB ist kein Ersatz für diese Angebote. Wenn du dich in einer akuten oder belastenden Situation
          befindest, sind diese Anlaufstellen der richtigere erste Schritt.
        </p>
      </BlogArticleLayout>
    </PageLayout>
  )
}
