import { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'

interface PageLayoutProps {
  children: ReactNode
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
    </div>
  )
}
