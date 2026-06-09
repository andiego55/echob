import { Routes, Route } from 'react-router-dom'
import LandingPage    from '@/pages/LandingPage'
import WaitlistPage   from '@/pages/WaitlistPage'
import ImpressumPage  from '@/pages/ImpressumPage'
import DatenschutzPage from '@/pages/DatenschutzPage'
import AuthPage       from '@/pages/AuthPage'
import AppPage        from '@/pages/AppPage'
import NotFoundPage   from '@/pages/NotFoundPage'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Öffentliche Seiten */}
      <Route path="/"            element={<LandingPage />} />
      <Route path="/warteliste"  element={<WaitlistPage />} />
      <Route path="/impressum"   element={<ImpressumPage />} />
      <Route path="/datenschutz" element={<DatenschutzPage />} />
      <Route path="/auth"        element={<AuthPage />} />

      {/* Eingeloggter Bereich */}
      <Route path="/app" element={
        <ProtectedRoute><AppPage /></ProtectedRoute>
      } />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
