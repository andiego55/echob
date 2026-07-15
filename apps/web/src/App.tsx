import { Routes, Route, Navigate } from 'react-router-dom'

// ── Öffentliche Seiten ────────────────────────────────────────────────────────
import LandingPage          from '@/pages/LandingPage'
import ImpressumPage        from '@/pages/ImpressumPage'
import DatenschutzPage      from '@/pages/DatenschutzPage'
import AGBPage              from '@/pages/AGBPage'
import WiderrufPage         from '@/pages/WiderrufPage'
import AuthPage             from '@/pages/AuthPage'
import ClientInvitePage     from '@/pages/ClientInvitePage'
import PseudonymAuthPage    from '@/pages/PseudonymAuthPage'
import NotFoundPage         from '@/pages/NotFoundPage'
import CoachingPage         from '@/pages/CoachingPage'
import UeberPage            from '@/pages/UeberPage'
import GruenderInterviewPage from '@/pages/GruenderInterviewPage'
import TeamPage             from '@/pages/TeamPage'
import FachpersonenPage     from '@/pages/FachpersonenPage'
import AusbildungPage       from '@/pages/AusbildungPage'
import WissenPage                    from '@/pages/WissenPage'
import ContentPage                   from '@/pages/content/ContentPage'
import GlossarPage                   from '@/pages/GlossarPage'
import ReflectPage                   from '@/pages/content/ReflectPage'

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
import InboxPage          from '@/pages/app/InboxPage'
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
import SettingsPage           from '@/pages/app/SettingsPage'
import { useParams }         from 'react-router-dom'
import { useAuth }           from '@/contexts/AuthContext'

function TopicDialogPageWrapper() {
  const { topicId } = useParams<{ topicId: string }>()
  return <TopicDialogPage key={topicId} />
}

function HypothesisDialogPageWrapper() {
  const { hypothesisId } = useParams<{ hypothesisId: string }>()
  return <HypothesisDialogPage key={hypothesisId} />
}

// Rollen-Weiche: Institut/Fachperson landen im jeweiligen Bereich, sonst in der Fallübersicht.
function AppHome() {
  const { session } = useAuth()
  const { data: pro, isLoading: proLoading } = useProfessional()
  const { data: institute, isLoading: instLoading } = useInstitute()
  const { data: student, isLoading: studLoading } = useStudent()
  if (proLoading || instLoading || studLoading) return <RoleSpinner />
  if (institute) return <Navigate to="/institute/dashboard" replace />
  if (student) return <Navigate to="/student/dashboard" replace />
  if (pro) return <Navigate to="/professional/dashboard" replace />
  // Selbst-registriert (Absicht aus dem Signup) → Profil-Anlage, statt fälschlich
  // im Klientenbereich zu landen.
  const pending = session?.user?.user_metadata?.pending_role
  if (pending === 'institute') return <Navigate to="/institute/register" replace />
  if (pending === 'student') return <Navigate to="/student/register" replace />
  if (pending === 'professional') return <Navigate to="/professional/register" replace />
  return <CasesOverviewPage />
}

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import ProfessionalRoute, { useProfessional, Spinner as RoleSpinner } from '@/components/auth/ProfessionalRoute'
import ProfessionalRegisterPage  from '@/pages/professional/ProfessionalRegisterPage'
import ProfessionalInboxPage     from '@/pages/professional/ProfessionalInboxPage'
import ProfessionalCaseDetailPage from '@/pages/professional/ProfessionalCaseDetailPage'
import ProfessionalEchoPage      from '@/pages/professional/ProfessionalEchoPage'
import ProfessionalDashboardPage from '@/pages/professional/ProfessionalDashboardPage'
import ProfessionalTemplatesPage from '@/pages/professional/ProfessionalTemplatesPage'
import ProfessionalSettingsPage  from '@/pages/professional/ProfessionalSettingsPage'
import ProfessionalReportTemplatesPage from '@/pages/professional/ProfessionalReportTemplatesPage'
import ProfessionalReportDetailPage from '@/pages/professional/ProfessionalReportDetailPage'
import CoupleEchoPage from '@/pages/professional/CoupleEchoPage'
import CoupleReportDetailPage from '@/pages/professional/CoupleReportDetailPage'
import InstituteRoute, { useInstitute } from '@/components/auth/InstituteRoute'
import InstituteRegisterPage from '@/pages/institute/InstituteRegisterPage'
import InstituteDashboardPage from '@/pages/institute/InstituteDashboardPage'
import InstituteGeneratePage from '@/pages/institute/InstituteGeneratePage'
import InstituteExampleEditorPage from '@/pages/institute/InstituteExampleEditorPage'
import InstituteStudentsPage from '@/pages/institute/InstituteStudentsPage'
import InstituteSubmissionsPage from '@/pages/institute/InstituteSubmissionsPage'
import InstituteSubmissionDetailPage from '@/pages/institute/InstituteSubmissionDetailPage'
import StudentRoute, { useStudent } from '@/components/auth/StudentRoute'
import StudentRegisterPage from '@/pages/student/StudentRegisterPage'
import StudentDashboardPage from '@/pages/student/StudentDashboardPage'
import StudentCaseDetailPage from '@/pages/student/StudentCaseDetailPage'
import StudentEchoPage from '@/pages/student/StudentEchoPage'
import StudentReportsPage from '@/pages/student/StudentReportsPage'
import StudentReportNewPage from '@/pages/student/StudentReportNewPage'
import StudentReportDetailPage from '@/pages/student/StudentReportDetailPage'
import StudentNotesPage from '@/pages/student/StudentNotesPage'
import StudentHypothesesPage from '@/pages/student/StudentHypothesesPage'
import StudentHypothesisDialogPage from '@/pages/student/StudentHypothesisDialogPage'
import StudentSubmitPage from '@/pages/student/StudentSubmitPage'
import DevNoticeModal from '@/components/DevNoticeModal'
import ConsentGate from '@/components/ConsentGate'
import LockScreen from '@/components/app/LockScreen'
import { QuickExitHotkey } from '@/components/app/QuickExit'
import PendingInviteHandler from '@/components/PendingInviteHandler'
import OnboardingGate from '@/components/auth/OnboardingGate'
import RouteSeo from '@/components/RouteSeo'

export default function App() {
  return (
    <>
    <RouteSeo />
    <DevNoticeModal />
    <ConsentGate />
    <LockScreen />
    <OnboardingGate />
    <QuickExitHotkey />
    <PendingInviteHandler />
    <AppRoutes />
    </>
  )
}

// Nur die Routen – ohne die App-Shell-Modals (DevNotice/Consent/Lock/…).
// Wird von <App> und vom Prerender (entry-server) gerendert, damit die
// statische HTML ausschließlich den eigentlichen Seiteninhalt enthält.
export function AppRoutes() {
  return (
    <Routes>
      {/* ── Öffentlich ─────────────────────────────────────────────────────── */}
      <Route path="/"            element={<LandingPage />} />
      <Route path="/impressum"   element={<ImpressumPage />} />
      <Route path="/datenschutz" element={<DatenschutzPage />} />
      <Route path="/agb"         element={<AGBPage />} />
      <Route path="/widerruf"    element={<WiderrufPage />} />
      <Route path="/auth"        element={<AuthPage />} />
      <Route path="/pseudonym"   element={<PseudonymAuthPage />} />
      <Route path="/einladung/:token" element={<ClientInvitePage />} />
      <Route path="/coaching"    element={<CoachingPage />} />
      <Route path="/ueber"       element={<UeberPage />} />
      <Route path="/ueber/gruender" element={<GruenderInterviewPage />} />
      <Route path="/ueber/team" element={<TeamPage />} />
      <Route path="/fachpersonen" element={<FachpersonenPage />} />
      <Route path="/ausbildungsinstitute" element={<AusbildungPage />} />
      <Route path="/wissen"                          element={<WissenPage />} />
      <Route path="/wissen/:slug"                    element={<ContentPage />} />
      <Route path="/hilfe/:slug"                     element={<ContentPage />} />
      <Route path="/glossar"                         element={<GlossarPage />} />
      <Route path="/glossar/:slug"                   element={<ContentPage />} />
      <Route path="/ratgeber/:slug"                  element={<ContentPage />} />
      <Route path="/fallbeispiele/:slug"             element={<ContentPage />} />
      <Route path="/therapie-vorbereitung/:slug"     element={<ContentPage />} />

      {/* ── App-Bereich (Login erforderlich) ───────────────────────────────── */}
      <Route path="/app" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />
      <Route path="/app/upgrade" element={<ProtectedRoute><UpgradePage /></ProtectedRoute>} />
      <Route path="/app/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
      <Route path="/app/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
      <Route path="/app/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/app/privacy" element={<ProtectedRoute><PrivacySettingsPage /></ProtectedRoute>} />
      <Route path="/app/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
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
      <Route path="/reflektieren" element={<ProtectedRoute><ReflectPage /></ProtectedRoute>} />
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
      <Route path="/professional/dashboard" element={<ProfessionalRoute><ProfessionalDashboardPage /></ProfessionalRoute>} />
      <Route path="/professional/templates" element={<ProfessionalRoute><ProfessionalTemplatesPage /></ProfessionalRoute>} />
      <Route path="/professional/settings" element={<ProfessionalRoute><ProfessionalSettingsPage /></ProfessionalRoute>} />
      <Route path="/professional/report-templates" element={<ProfessionalRoute><ProfessionalReportTemplatesPage /></ProfessionalRoute>} />
      <Route path="/professional/cases/:caseId" element={<ProfessionalRoute><ProfessionalCaseDetailPage /></ProfessionalRoute>} />
      <Route path="/professional/cases/:caseId/echo" element={<ProfessionalRoute><ProfessionalEchoPage /></ProfessionalRoute>} />
      <Route path="/professional/cases/:caseId/reports/:reportId" element={<ProfessionalRoute><ProfessionalReportDetailPage /></ProfessionalRoute>} />
      <Route path="/professional/couples/:coupleId/echo" element={<ProfessionalRoute><CoupleEchoPage /></ProfessionalRoute>} />
      <Route path="/professional/couples/:coupleId/reports/:reportId" element={<ProfessionalRoute><CoupleReportDetailPage /></ProfessionalRoute>} />

      {/* ── Ausbildungsbereich · Institut (Login + Rolle erforderlich) ────────── */}
      <Route path="/institute/register" element={<ProtectedRoute><InstituteRegisterPage /></ProtectedRoute>} />
      <Route path="/institute/dashboard" element={<InstituteRoute><InstituteDashboardPage /></InstituteRoute>} />
      <Route path="/institute/examples/new" element={<InstituteRoute><InstituteGeneratePage /></InstituteRoute>} />
      <Route path="/institute/examples/:id" element={<InstituteRoute><InstituteExampleEditorPage /></InstituteRoute>} />
      <Route path="/institute/students" element={<InstituteRoute><InstituteStudentsPage /></InstituteRoute>} />
      <Route path="/institute/submissions" element={<InstituteRoute><InstituteSubmissionsPage /></InstituteRoute>} />
      <Route path="/institute/submissions/:id" element={<InstituteRoute><InstituteSubmissionDetailPage /></InstituteRoute>} />

      {/* ── Ausbildungsbereich · Student:in (Login + Rolle erforderlich) ──────── */}
      <Route path="/student/register" element={<ProtectedRoute><StudentRegisterPage /></ProtectedRoute>} />
      <Route path="/student/dashboard" element={<StudentRoute><StudentDashboardPage /></StudentRoute>} />
      <Route path="/student/cases/:id" element={<StudentRoute><StudentCaseDetailPage /></StudentRoute>} />
      <Route path="/student/cases/:id/echo" element={<StudentRoute><StudentEchoPage /></StudentRoute>} />
      <Route path="/student/cases/:id/hypotheses" element={<StudentRoute><StudentHypothesesPage /></StudentRoute>} />
      <Route path="/student/cases/:id/hypotheses/:hypId" element={<StudentRoute><StudentHypothesisDialogPage /></StudentRoute>} />
      <Route path="/student/cases/:id/reports" element={<StudentRoute><StudentReportsPage /></StudentRoute>} />
      <Route path="/student/cases/:id/reports/new" element={<StudentRoute><StudentReportNewPage /></StudentRoute>} />
      <Route path="/student/cases/:id/reports/:reportId" element={<StudentRoute><StudentReportDetailPage /></StudentRoute>} />
      <Route path="/student/cases/:id/notes" element={<StudentRoute><StudentNotesPage /></StudentRoute>} />
      <Route path="/student/cases/:id/submit" element={<StudentRoute><StudentSubmitPage /></StudentRoute>} />

      {/* ── Fallback ───────────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
