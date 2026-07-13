/**
 * Prominenter Sicherheitshinweis – nur bei Seiten mit `safety_tags`
 * (Gewalt/Bedrohung/Stalking/Krise/Selbstgefährdung). Nutzt dieselben
 * Krisen-Ressourcen wie die App.
 */
export default function SafetyNotice() {
  return (
    <div className="not-prose my-6 rounded-brand border border-red-200 bg-red-50 px-5 py-4">
      <p className="text-sm font-semibold text-red-800">Wenn es um akute Gefahr geht</p>
      <p className="mt-1 text-sm leading-relaxed text-red-700">
        Bei unmittelbarer Bedrohung wähle den Notruf <strong>112</strong>. Die Telefonseelsorge ist rund
        um die Uhr, kostenlos und anonym erreichbar: <strong>0800 111 0 111</strong> oder{' '}
        <strong>0800 111 0 222</strong>. EchoB ersetzt keine Krisen- oder Notfallhilfe.
      </p>
    </div>
  )
}
