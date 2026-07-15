import { Link } from 'react-router-dom'

interface Props {
  tag: string
  title: string
  subtitle: string
  echoLink: string
  echoTitle: string
  echoText: string
  echoCta: string
  echoSteps: string[]
  backLink?: string
  backLabel?: string
  children: React.ReactNode
}

export default function BlogArticleLayout({
  tag, title, subtitle, echoLink, echoTitle, echoText, echoCta, echoSteps,
  backLink = '/wissen', backLabel = 'Zurück zum Wissen',
  children,
}: Props) {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy text-white px-6 pt-[calc(60px+4rem)] pb-16">
        <div className="mx-auto max-w-[720px]">
          <Link to={backLink} className="text-[0.82rem] text-white/50 hover:text-white transition-colors no-underline mb-6 inline-block">
            ← {backLabel}
          </Link>
          <span className="label block mb-3">{tag}</span>
          <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-extrabold leading-[1.2] tracking-[-0.02em]">
            {title}
          </h1>
          <p className="mt-4 text-[0.9rem] text-white/50">{subtitle}</p>
        </div>
      </section>

      {/* Article body */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[720px] prose-article">
          {children}

          {/* Disclaimer */}
          <div className="mt-14 rounded-brand border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm text-amber-800">
              <strong>Hinweis:</strong> Dieser Artikel dient der allgemeinen Orientierung und ersetzt keine
              professionelle Beratung, Psychotherapie oder medizinische Diagnostik. Bei akuter Gefahr:
              Telefonseelsorge <strong>0800 111 0 111</strong> (kostenlos, 24/7) oder Notruf <strong>112</strong>.
            </p>
          </div>

          {/* Echo CTA */}
          <div className="mt-8 rounded-brand border border-accent/25 bg-accent/5 px-6 py-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2 block">EchoB</span>
            <h3 className="text-base font-bold text-navy mb-2">{echoTitle}</h3>
            <p className="text-sm text-brand-muted leading-relaxed mb-4">{echoText}</p>
            <ol className="text-sm text-brand-muted mb-5 list-decimal list-inside space-y-1">
              {echoSteps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
            <Link to={echoLink} className="btn-primary inline-block">
              {echoCta}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
