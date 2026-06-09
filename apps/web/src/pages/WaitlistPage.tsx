import PageLayout from '@/components/layout/PageLayout'
import WaitlistForm from '@/components/waitlist/WaitlistForm'

export default function WaitlistPage() {
  return (
    <PageLayout>
      {/* Page Hero (navy) */}
      <section className="bg-navy text-white px-6 pt-[calc(60px+52px)] pb-[52px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Warteliste</span>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em]">
            Sei dabei, wenn EchoB startet.
          </h1>
          <p className="mt-2.5 text-[0.95rem] text-brand-blue max-w-[560px]">
            EchoB befindet sich in der Entwicklung. Trag dich ein – wir melden uns,
            sobald es losgeht.
          </p>
        </div>
      </section>

      {/* Formular (hell) */}
      <section className="px-6 py-[72px]">
        <div className="mx-auto max-w-lg">
          <WaitlistForm />
        </div>
      </section>
    </PageLayout>
  )
}
