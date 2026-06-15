import { Routes, Route, Navigate } from 'react-router-dom'

// ── Öffentliche Seiten ────────────────────────────────────────────────────────
import LandingPage          from '@/pages/LandingPage'
import ImpressumPage        from '@/pages/ImpressumPage'
import DatenschutzPage      from '@/pages/DatenschutzPage'
import AuthPage             from '@/pages/AuthPage'
import NotFoundPage         from '@/pages/NotFoundPage'
import CoachingPage         from '@/pages/CoachingPage'
import UeberPage            from '@/pages/UeberPage'
import GruenderInterviewPage from '@/pages/GruenderInterviewPage'
import TeamPage             from '@/pages/TeamPage'
import FachpersonenPage     from '@/pages/FachpersonenPage'
import BlogPage             from '@/pages/BlogPage'
import BlogBeziehungsmusterPage    from '@/pages/BlogBeziehungsmusterPage'
import BlogBeobachtungGefuehlPage  from '@/pages/BlogBeobachtungGefuehlPage'
import BlogProfessionelleHilfePage from '@/pages/BlogProfessionelleHilfePage'
import BlogKrisentelephonePage     from '@/pages/BlogKrisentelephonePage'
import WissenPage                    from '@/pages/WissenPage'
import WissenBeziehungsmusterPage    from '@/pages/wissen/WissenBeziehungsmusterPage'
import WissenBindungsstilelPage      from '@/pages/wissen/WissenBindungsstilelPage'
import WissenKommunikationPage       from '@/pages/wissen/WissenKommunikationPage'
import WissenPersoenlichkeitPage     from '@/pages/wissen/WissenPersoenlichkeitPage'
import WissenEmotionsregulationPage  from '@/pages/wissen/WissenEmotionsregulationPage'
import WissenBeobachtungPage         from '@/pages/wissen/WissenBeobachtungPage'
import WissenGrenzenPage             from '@/pages/wissen/WissenGrenzenPage'
import WissenProfessionelleHilfePage from '@/pages/wissen/WissenProfessionelleHilfePage'
import WissenKrisentelephonePage     from '@/pages/wissen/WissenKrisentelephonePage'

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
import ReviewPage        from '@/pages/app/ReviewPage'
import ReportsPage       from '@/pages/app/ReportsPage'
import ReportNewPage      from '@/pages/app/ReportNewPage'
import ReportDetailPage   from '@/pages/app/ReportDetailPage'
import PrintSummaryPage   from '@/pages/app/PrintSummaryPage'
import HelpPage           from '@/pages/app/HelpPage'
import ProfilePage           from '@/pages/app/ProfilePage'
import ProfileEchoPage       from '@/pages/app/ProfileEchoPage'
import PersonProfilePage     from '@/pages/app/PersonProfilePage'
import PersonProfileEchoPage from '@/pages/app/PersonProfileEchoPage'
import TopicDialogPage       from '@/pages/app/TopicDialogPage'
import HypothesesPage        from '@/pages/app/HypothesesPage'
import HypothesisDialogPage  from '@/pages/app/HypothesisDialogPage'
import UpgradePage           from '@/pages/app/UpgradePage'
import CaseSharingPage        from '@/pages/app/CaseSharingPage'
import PrivacySettingsPage    from '@/pages/app/PrivacySettingsPage'
import { useParams }         from 'react-router-dom'

function TopicDialogPageWrapper() {
  const { topicId } = useParams<{ topicId: string }>()
  return <TopicDialogPage key={topicId} />
}

function HypothesisDialogPageWrapper() {
  const { hypothesisId } = useParams<{ hypothesisId: string }>()
  return <HypothesisDialogPage key={hypothesisId} />
}

// Rollen-Weiche: Fachpersonen landen im Fachpersonenbereich, sonst in der Fallübersicht.
function AppHome() {
  const { data, isLoading } = useProfessional()
  if (isLoading) return <RoleSpinner />
  if (data) return <Navigate to="/professional" replace />
  return <CasesOverviewPage />
}

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import ProfessionalRoute, { useProfessional, Spinner as RoleSpinner } from '@/components/auth/ProfessionalRoute'
import ProfessionalRegisterPage  from '@/pages/professional/ProfessionalRegisterPage'
import ProfessionalInboxPage     from '@/pages/professional/ProfessionalInboxPage'
import ProfessionalCasesPage     from '@/pages/professional/ProfessionalCasesPage'
import ProfessionalCaseDetailPage from '@/pages/professional/ProfessionalCaseDetailPage'
import ProfessionalEchoPage      from '@/pages/professional/ProfessionalEchoPage'
import DevNoticeModal from '@/components/DevNoticeModal'
import LockScreen from '@/components/app/LockScreen'
import { QuickExitHotkey } from '@/components/app/QuickExit'

export default function App() {
  return (
    <>
    <DevNoticeModal />
    <LockScreen />
    <QuickExitHotkey />
    <Routes>
      {/* ── Öffentlich ─────────────────────────────────────────────────────── */}
      <Route path="/"            element={<LandingPage />} />
      <Route path="/impressum"   element={<ImpressumPage />} />
      <Route path="/datenschutz" element={<DatenschutzPage />} />
      <Route path="/auth"        element={<AuthPage />} />
      <Route path="/coaching"    element={<CoachingPage />} />
      <Route path="/ueber"       element={<UeberPage />} />
      <Route path="/ueber/gruender" element={<GruenderInterviewPage />} />
      <Route path="/ueber/team" element={<TeamPage />} />
      <Route path="/fachpersonen" element={<FachpersonenPage />} />
      <Route path="/blog"        element={<BlogPage />} />
      <Route path="/blog/beziehungsmuster"   element={<BlogBeziehungsmusterPage />} />
      <Route path="/blog/beobachtung-gefuehl" element={<BlogBeobachtungGefuehlPage />} />
      <Route path="/blog/professionelle-hilfe" element={<BlogProfessionelleHilfePage />} />
      <Route path="/blog/krisentelefone"     element={<BlogKrisentelephonePage />} />
      <Route path="/wissen"                          element={<WissenPage />} />
      <Route path="/wissen/beziehungsmuster"         element={<WissenBeziehungsmusterPage />} />
      <Route path="/wissen/bindungsstile"            element={<WissenBindungsstilelPage />} />
      <Route path="/wissen/kommunikation-konflikte"  element={<WissenKommunikationPage />} />
      <Route path="/wissen/persoenlichkeit-verhalten" element={<WissenPersoenlichkeitPage />} />
      <Route path="/wissen/emotionsregulation"       element={<WissenEmotionsregulationPage />} />
      <Route path="/wissen/beobachtung-gefuehl"      element={<WissenBeobachtungPage />} />
      <Route path="/wissen/grenzen-setzen"           element={<WissenGrenzenPage />} />
      <Route path="/wissen/professionelle-hilfe"     element={<WissenProfessionelleHilfePage />} />
      <Route path="/wissen/krisentelefone"           element={<WissenKrisentelephonePage />} />

      {/* ── App-Bereich (Login erforderlich) ───────────────────────────────── */}
      <Route path="/app" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />
      <Route path="/app/upgrade" element={<ProtectedRoute><UpgradePage /></ProtectedRoute>} />
      <Route path="/app/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
      <Route path="/app/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/app/privacy" element={<ProtectedRoute><PrivacySettingsPage /></ProtectedRoute>} />
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
      <Route path="/app/cases/:caseId/share" element={<ProtectedRoute><CaseSharingPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/scales" element={<ProtectedRoute><ScalesPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/review" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/reports/new" element={<ProtectedRoute><ReportNewPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/reports/:reportId" element={<ProtectedRoute><ReportDetailPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/export" element={<ProtectedRoute><PrintSummaryPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/topics/:topicId" element={<ProtectedRoute><TopicDialogPageWrapper /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/hypotheses" element={<ProtectedRoute><HypothesesPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/hypotheses/:hypothesisId" element={<ProtectedRoute><HypothesisDialogPageWrapper /></ProtectedRoute>} />

      {/* ── Fachpersonenbereich (Login + Rolle erforderlich) ─────────────────── */}
      <Route path="/professional/register" element={<ProtectedRoute><ProfessionalRegisterPage /></ProtectedRoute>} />
      <Route path="/professional" element={<ProfessionalRoute><ProfessionalInboxPage /></ProfessionalRoute>} />
      <Route path="/professional/cases" element={<ProfessionalRoute><ProfessionalCasesPage /></ProfessionalRoute>} />
      <Route path="/professional/cases/:caseId" element={<ProfessionalRoute><ProfessionalCaseDetailPage /></ProfessionalRoute>} />
      <Route path="/professional/cases/:caseId/echo" element={<ProfessionalRoute><ProfessionalEchoPage /></ProfessionalRoute>} />

      {/* ── Fallback ───────────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </>
  )
}
