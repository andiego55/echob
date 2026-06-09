import { useAuth } from '@/contexts/AuthContext'

export default function AppPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="bg-navy border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
        <span className="text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
          Echo<span className="text-accent">B</span>
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/60">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Abmelden
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[960px] px-6 py-16 text-center">
        <span className="label">Eingeloggt</span>
        <h1 className="mt-3 text-3xl font-bold text-navy">
          Willkommen bei EchoB
        </h1>
        <p className="mt-4 text-brand-muted max-w-md mx-auto">
          Die App ist in Entwicklung. Hier wird bald dein Reflexions-Dashboard erscheinen.
        </p>
      </main>
    </div>
  )
}
