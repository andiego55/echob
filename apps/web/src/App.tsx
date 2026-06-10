import { Routes, Route } from 'react-router-dom'

// ── Öffentliche Seiten ────────────────────────────────────────────────────────
import LandingPage     from '@/pages/LandingPage'
import WaitlistPage    from '@/pages/WaitlistPage'
import ImpressumPage   from '@/pages/ImpressumPage'
import DatenschutzPage from '@/pages/DatenschutzPage'
import AuthPage        from '@/pages/AuthPage'
import NotFoundPage    from '@/pages/NotFoundPage'

// ── App-Bereich ───────────────────────────────────────────────────────────────
import CasesOverviewPage from '@/pages/app/CasesOverviewPage'
import CaseNewPage       from '@/pages/app/CaseNewPage'
import CaseDetailPage    from '@/pages/app/CaseDetailPage'
import OnboardingPage    from '@/pages/app/OnboardingPage'
import ScenesPage        from '@/pages/app/ScenesPage'
import SceneNewPage      from '@/pages/app/SceneNewPage'
import SceneDetailPage   from '@/pages/app/SceneDetailPage'
import SceneEchoPage     from '@/pages/app/SceneEchoPage'
import EchoPage          from '@/pages/app/EchoPage'
import ScalesPage        from '@/pages/app/ScalesPage'
import ReportsPage       from '@/pages/app/ReportsPage'
import ReportNewPage      from '@/pages/app/ReportNewPage'
import ReportDetailPage   from '@/pages/app/ReportDetailPage'
import HelpPage           from '@/pages/app/HelpPage'
import ProfilePage           from '@/pages/app/ProfilePage'
import ProfileEchoPage       from '@/pages/app/ProfileEchoPage'
import PersonProfilePage     from '@/pages/app/PersonProfilePage'
import PersonProfileEchoPage from '@/pages/app/PersonProfileEchoPage'

import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* ── Öffentlich ─────────────────────────────────────────────────────── */}
      <Route path="/"            element={<LandingPage />} />
      <Route path="/warteliste"  element={<WaitlistPage />} />
      <Route path="/impressum"   element={<ImpressumPage />} />
      <Route path="/datenschutz" element={<DatenschutzPage />} />
      <Route path="/auth"        element={<AuthPage />} />

      {/* ── App-Bereich (Login erforderlich) ───────────────────────────────── */}
      <Route path="/app" element={<ProtectedRoute><CasesOverviewPage /></ProtectedRoute>} />
      <Route path="/app/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
      <Route path="/app/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/app/profile/echo" element={<ProtectedRoute><ProfileEchoPage /></ProtectedRoute>} />
      <Route path="/app/cases/new" element={<ProtectedRoute><CaseNewPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId" element={<ProtectedRoute><CaseDetailPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/person-profile" element={<ProtectedRoute><PersonProfilePage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/person-profile/echo" element={<ProtectedRoute><PersonProfileEchoPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/scenes" element={<ProtectedRoute><ScenesPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/scenes/new" element={<ProtectedRoute><SceneNewPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/scenes/echo" element={<ProtectedRoute><SceneEchoPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/scenes/:sceneId" element={<ProtectedRoute><SceneDetailPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/echo" element={<ProtectedRoute><EchoPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/scales" element={<ProtectedRoute><ScalesPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/reports/new" element={<ProtectedRoute><ReportNewPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/reports/:reportId" element={<ProtectedRoute><ReportDetailPage /></ProtectedRoute>} />

      {/* ── Fallback ───────────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
