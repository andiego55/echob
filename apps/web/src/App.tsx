import { Routes, Route } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import WaitlistPage from '@/pages/WaitlistPage'
import ImpressumPage from '@/pages/ImpressumPage'
import DatenschutzPage from '@/pages/DatenschutzPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/warteliste" element={<WaitlistPage />} />
      <Route path="/impressum" element={<ImpressumPage />} />
      <Route path="/datenschutz" element={<DatenschutzPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
