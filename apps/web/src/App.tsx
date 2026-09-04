import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// ── Öffentliche Seiten ────────────────────────────────────────────────────────
import LandingPage          from '@/pages/LandingPage'
const ImpressumPage = lazy(() => import('@/pages/ImpressumPage'))
const DatenschutzPage = lazy(() => import('@/pages/DatenschutzPage'))
const AGBPage = lazy(() => import('@/pages/AGBPage'))
const WiderrufPage = lazy(() => import('@/pages/WiderrufPage'))
import AuthPage             from '@/pages/AuthPage'
const ClientInvitePage = lazy(() => import('@/pages/ClientInvitePage'))
const PseudonymAuthPage = lazy(() => import('@/pages/PseudonymAuthPage'))
import NotFoundPage         from '@/pages/NotFoundPage'
const CoachingPage = lazy(() => import('@/pages/CoachingPage'))
const UeberPage = lazy(() => import('@/pages/UeberPage'))
const UeberMissionPage = lazy(() => import('@/pages/UeberMissionPage'))
const GruenderInterviewPage = lazy(() => import('@/pages/GruenderInterviewPage'))
const TeamPage = lazy(() => import('@/pages/TeamPage'))
const FachpersonenPage = lazy(() => import('@/pages/FachpersonenPage'))
const FachpersonenFindenPage = lazy(() => import('@/pages/FachpersonenFindenPage'))
const FachpersonProfilePage = lazy(() => import('@/pages/FachpersonProfilePage'))
const AusbildungPage = lazy(() => import('@/pages/AusbildungPage'))
const ForschungPage = lazy(() => import('@/pages/ForschungPage'))
const WissenPage = lazy(() => import('@/pages/WissenPage'))
const ContentPage = lazy(() => import('@/pages/content/ContentPage'))
const GlossarPage = lazy(() => import('@/pages/GlossarPage'))
const SzenenPage = lazy(() => import('@/pages/content/SzenenPage'))
const SzeneDetailPage = lazy(() => import('@/pages/content/SzeneDetailPage'))
const SelbsttestsPage = lazy(() => import('@/pages/content/SelbsttestsPage'))
const SelbsttestDetailPage = lazy(() => import('@/pages/content/SelbsttestDetailPage'))
const KompatibilitaetPage = lazy(() => import('@/pages/content/KompatibilitaetPage'))
const ReflectPage = lazy(() => import('@/pages/content/ReflectPage'))

// ── App-Bereich ───────────────────────────────────────────────────────────────
const CasesOverviewPage = lazy(() => import('@/pages/app/CasesOverviewPage'))
const CaseNewPage = lazy(() => import('@/pages/app/CaseNewPage'))
const CaseDetailPage = lazy(() => import('@/pages/app/CaseDetailPage'))
const OnboardingPage = lazy(() => import('@/pages/app/OnboardingPage'))
const ScenesPage = lazy(() => import('@/pages/app/ScenesPage'))
const SceneNewPage = lazy(() => import('@/pages/app/SceneNewPage'))
const SceneDetailPage = lazy(() => import('@/pages/app/SceneDetailPage'))
const SceneEchoPage = lazy(() => import('@/pages/app/SceneEchoPage'))
const EchoPage = lazy(() => import('@/pages/app/EchoPage'))
const DocumentsPage = lazy(() => import('@/pages/app/DocumentsPage'))
const ScalesPage = lazy(() => import('@/pages/app/ScalesPage'))
const ReviewPage = lazy(() => import('@/pages/app/ReviewPage'))
const ReportsPage = lazy(() => import('@/pages/app/ReportsPage'))
const ReportNewPage = lazy(() => import('@/pages/app/ReportNewPage'))
const ReportDetailPage = lazy(() => import('@/pages/app/ReportDetailPage'))
const PrintSummaryPage = lazy(() => import('@/pages/app/PrintSummaryPage'))
const HelpPage = lazy(() => import('@/pages/app/HelpPage'))
const InboxPage = lazy(() => import('@/pages/app/InboxPage'))
const ProfilePage = lazy(() => import('@/pages/app/ProfilePage'))
const ProfileEchoPage = lazy(() => import('@/pages/app/ProfileEchoPage'))
const PersonProfilePage = lazy(() => import('@/pages/app/PersonProfilePage'))
const PersonProfileEchoPage = lazy(() => import('@/pages/app/PersonProfileEchoPage'))
const TopicDialogPage = lazy(() => import('@/pages/app/TopicDialogPage'))
const SelfTestDialoguePage = lazy(() => import('@/pages/app/SelfTestDialoguePage'))
const HypothesesPage = lazy(() => import('@/pages/app/HypothesesPage'))
const HypothesisDialogPage = lazy(() => import('@/pages/app/HypothesisDialogPage'))
const UpgradePage = lazy(() => import('@/pages/app/UpgradePage'))
const CaseSharingPage = lazy(() => import('@/pages/app/CaseSharingPage'))
const ZuZweitPage = lazy(() => import('@/pages/ZuZweitPage'))
const CoupleOverviewPage = lazy(() => import('@/pages/couple/CoupleOverviewPage'))
const CoupleJoinPage = lazy(() => import('@/pages/couple/CoupleJoinPage'))
const CoupleRoomPage = lazy(() => import('@/pages/couple/CoupleRoomPage'))
const CoupleSessionPage = lazy(() => import('@/pages/couple/CoupleSessionPage'))
const CoupleMediationPage = lazy(() => import('@/pages/couple/CoupleMediationPage'))
const CoupleTestPage = lazy(() => import('@/pages/couple/CoupleTestPage'))
import {
  CoupleSessionsPage, CoupleTopicsPage, CoupleAgreementsPage,
  CoupleTestsPage, CoupleProgressPage,
  CoupleRetrospectPage, CoupleQuestionsPage, CoupleImpulsePage,
  CoupleSharesPage, CoupleSettingsPage,
} from '@/pages/couple/CoupleTabPages'
// Nicht zu verwechseln mit der Paar-Analyse im Fachpersonenbereich (weiter unten).
const CouplePartnerEchoPage = lazy(() => import('@/pages/couple/CoupleEchoPage'))
const CoupleDeescalationPage = lazy(() => import('@/pages/couple/CoupleDeescalationPage'))
const CoupleHonestPage = lazy(() => import('@/pages/couple/CoupleHonestPage'))
const PrivacySettingsPage = lazy(() => import('@/pages/app/PrivacySettingsPage'))
const SettingsPage = lazy(() => import('@/pages/app/SettingsPage'))
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
const ProfessionalRegisterPage = lazy(() => import('@/pages/professional/ProfessionalRegisterPage'))
const ProfessionalInboxPage = lazy(() => import('@/pages/professional/ProfessionalInboxPage'))
const ProfessionalCaseDetailPage = lazy(() => import('@/pages/professional/ProfessionalCaseDetailPage'))
const ProfessionalEchoPage = lazy(() => import('@/pages/professional/ProfessionalEchoPage'))
const ProfessionalDashboardPage = lazy(() => import('@/pages/professional/ProfessionalDashboardPage'))
const ProfessionalTemplatesPage = lazy(() => import('@/pages/professional/ProfessionalTemplatesPage'))
const ProfessionalSettingsPage = lazy(() => import('@/pages/professional/ProfessionalSettingsPage'))
const ProfessionalProfilePage = lazy(() => import('@/pages/professional/ProfessionalProfilePage'))
const AdminDirectoryPage = lazy(() => import('@/pages/admin/AdminDirectoryPage'))
const RegionalPage = lazy(() => import('@/pages/RegionalPage'))
import { REGION_PROFESSIONS }    from '@/directory/regions'
const ProfessionalReportTemplatesPage = lazy(() => import('@/pages/professional/ProfessionalReportTemplatesPage'))
const ProfessionalReportDetailPage = lazy(() => import('@/pages/professional/ProfessionalReportDetailPage'))
const CoupleEchoPage = lazy(() => import('@/pages/professional/CoupleEchoPage'))
const ProfCoupleRoomPage = lazy(() => import('@/pages/professional/CoupleRoomPage'))
const CoupleReportDetailPage = lazy(() => import('@/pages/professional/CoupleReportDetailPage'))
import InstituteRoute, { useInstitute } from '@/components/auth/InstituteRoute'
const InstituteRegisterPage = lazy(() => import('@/pages/institute/InstituteRegisterPage'))
const InstituteDashboardPage = lazy(() => import('@/pages/institute/InstituteDashboardPage'))
const InstituteMarketplaceDetailPage = lazy(() => import('@/pages/institute/InstituteMarketplaceDetailPage'))
const InstituteGeneratePage = lazy(() => import('@/pages/institute/InstituteGeneratePage'))
const InstituteExampleEditorPage = lazy(() => import('@/pages/institute/InstituteExampleEditorPage'))
const InstituteStudentsPage = lazy(() => import('@/pages/institute/InstituteStudentsPage'))
const InstituteSubmissionsPage = lazy(() => import('@/pages/institute/InstituteSubmissionsPage'))
const InstituteSubmissionDetailPage = lazy(() => import('@/pages/institute/InstituteSubmissionDetailPage'))
const InstituteRubricsPage = lazy(() => import('@/pages/institute/InstituteRubricsPage'))
const InstituteAssignmentsPage = lazy(() => import('@/pages/institute/InstituteAssignmentsPage'))
const InstituteAssignmentDetailPage = lazy(() => import('@/pages/institute/InstituteAssignmentDetailPage'))
const InstituteSettingsPage = lazy(() => import('@/pages/institute/InstituteSettingsPage'))
const InstituteModulesPage = lazy(() => import('@/pages/institute/InstituteModulesPage'))
const InstituteModuleDetailPage = lazy(() => import('@/pages/institute/InstituteModuleDetailPage'))
import StudentRoute, { useStudent } from '@/components/auth/StudentRoute'
const StudentRegisterPage = lazy(() => import('@/pages/student/StudentRegisterPage'))
const StudentDashboardPage = lazy(() => import('@/pages/student/StudentDashboardPage'))
const StudentCaseDetailPage = lazy(() => import('@/pages/student/StudentCaseDetailPage'))
const StudentEchoPage = lazy(() => import('@/pages/student/StudentEchoPage'))
const StudentReportsPage = lazy(() => import('@/pages/student/StudentReportsPage'))
const StudentReportNewPage = lazy(() => import('@/pages/student/StudentReportNewPage'))
const StudentReportDetailPage = lazy(() => import('@/pages/student/StudentReportDetailPage'))
const StudentNotesPage = lazy(() => import('@/pages/student/StudentNotesPage'))
const StudentHypothesesPage = lazy(() => import('@/pages/student/StudentHypothesesPage'))
const StudentHypothesisDialogPage = lazy(() => import('@/pages/student/StudentHypothesisDialogPage'))
const StudentSubmitPage = lazy(() => import('@/pages/student/StudentSubmitPage'))
const StudentCouplePage = lazy(() => import('@/pages/student/StudentCouplePage'))
const StudentRoleplayPage = lazy(() => import('@/pages/student/StudentRoleplayPage'))
const StudentAssignmentsPage = lazy(() => import('@/pages/student/StudentAssignmentsPage'))
const StudentModulesPage = lazy(() => import('@/pages/student/StudentModulesPage'))
const StudentModuleDetailPage = lazy(() => import('@/pages/student/StudentModuleDetailPage'))
const StudentScalesPage = lazy(() => import('@/pages/student/StudentScalesPage'))
const StudentReviewPage = lazy(() => import('@/pages/student/StudentReviewPage'))
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
/**
 * Der Rueckfall, waehrend ein Bereichs-Buendel geladen wird.
 *
 * Bewusst karg: Ein Spinner, der bei einem 40-ms-Chunk aufblitzt, wirkt unruhiger als eine
 * kurze leere Flaeche. Die Mindesthoehe haelt das Layout, damit beim Eintreffen nichts
 * springt. Nur wenn es wirklich dauert, erscheint nach 400 ms ein Hinweis.
 */
function BereichLaedt() {
  return (
    <div className="min-h-[60vh]" role="status" aria-busy="true">
      <span className="sr-only">Bereich wird geladen</span>
    </div>
  )
}

export function AppRoutes({ suspense = true }: { suspense?: boolean } = {}) {
  const routen = (
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
      <Route path="/paartherapie" element={<ZuZweitPage />} />
      <Route path="/ueber"       element={<UeberPage />} />
      <Route path="/ueber/mission" element={<UeberMissionPage />} />
      <Route path="/ueber/gruender" element={<GruenderInterviewPage />} />
      <Route path="/ueber/team" element={<TeamPage />} />
      <Route path="/fachpersonen" element={<FachpersonenFindenPage />} />
      <Route path="/fachpersonen/:slug" element={<FachpersonProfilePage />} />
      <Route path="/fuer-fachpersonen" element={<FachpersonenPage />} />
      {/* SEO-Regionalseiten: /<profession>/:city (z. B. /paartherapie/kassel) */}
      {REGION_PROFESSIONS.map((p) => (
        <Route key={p.slug} path={`/${p.slug}/:city`} element={<RegionalPage professionSlug={p.slug} />} />
      ))}
      <Route path="/ausbildungsinstitute" element={<AusbildungPage />} />
      <Route path="/forschung" element={<ForschungPage />} />
      <Route path="/wissen"                          element={<WissenPage />} />
      <Route path="/wissen/:slug"                    element={<ContentPage />} />
      <Route path="/hilfe/:slug"                     element={<ContentPage />} />
      <Route path="/glossar"                         element={<GlossarPage />} />
      <Route path="/glossar/:slug"                   element={<ContentPage />} />
      <Route path="/szenen"                          element={<SzenenPage />} />
      <Route path="/szenen/:slug"                    element={<SzeneDetailPage />} />
      <Route path="/selbsttests"                     element={<SelbsttestsPage />} />
      <Route path="/selbsttests/:slug"               element={<SelbsttestDetailPage />} />
      <Route path="/kompatibilitaet"                 element={<KompatibilitaetPage />} />
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
      <Route path="/app/cases/:caseId/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/scales" element={<ProtectedRoute><ScalesPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/review" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/reports/new" element={<ProtectedRoute><ReportNewPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/reports/:reportId" element={<ProtectedRoute><ReportDetailPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/export" element={<ProtectedRoute><PrintSummaryPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/topics/:topicId" element={<ProtectedRoute><TopicDialogPageWrapper /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/selbsttest/:slug" element={<ProtectedRoute><SelfTestDialoguePage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/hypotheses" element={<ProtectedRoute><HypothesesPage /></ProtectedRoute>} />
      <Route path="/app/cases/:caseId/hypotheses/:hypothesisId" element={<ProtectedRoute><HypothesisDialogPageWrapper /></ProtectedRoute>} />

      {/* ── Paartherapie (zwei Nutzer:innen, eigener Funktionsbereich) ───────── */}
      <Route path="/app/paar" element={<ProtectedRoute><CoupleOverviewPage /></ProtectedRoute>} />
      <Route path="/app/paar/beitreten/:code" element={<ProtectedRoute><CoupleJoinPage /></ProtectedRoute>} />
      <Route path="/app/paar/sitzung/:sessionId" element={<ProtectedRoute><CoupleSessionPage /></ProtectedRoute>} />
      <Route path="/app/paar/thema/:topicId" element={<ProtectedRoute><CoupleMediationPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/echo" element={<ProtectedRoute><CouplePartnerEchoPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/streit" element={<ProtectedRoute><CoupleDeescalationPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/mitteilen" element={<ProtectedRoute><CoupleHonestPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/gespraeche" element={<ProtectedRoute><CoupleSessionsPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/mediation" element={<ProtectedRoute><CoupleTopicsPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/abmachungen" element={<ProtectedRoute><CoupleAgreementsPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/tests" element={<ProtectedRoute><CoupleTestsPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/fragen" element={<ProtectedRoute><CoupleQuestionsPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/impulse" element={<ProtectedRoute><CoupleImpulsePage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/rueckblick" element={<ProtectedRoute><CoupleRetrospectPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/freigaben" element={<ProtectedRoute><CoupleSharesPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/fortschritt" element={<ProtectedRoute><CoupleProgressPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/einstellungen" element={<ProtectedRoute><CoupleSettingsPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId/test/:slug" element={<ProtectedRoute><CoupleTestPage /></ProtectedRoute>} />
      <Route path="/app/paar/:coupleId" element={<ProtectedRoute><CoupleRoomPage /></ProtectedRoute>} />

      {/* ── Fachpersonenbereich (Login + Rolle erforderlich) ─────────────────── */}
      <Route path="/professional/register" element={<ProtectedRoute><ProfessionalRegisterPage /></ProtectedRoute>} />
      <Route path="/professional" element={<ProfessionalRoute><ProfessionalInboxPage /></ProfessionalRoute>} />
      <Route path="/professional/dashboard" element={<ProfessionalRoute><ProfessionalDashboardPage /></ProfessionalRoute>} />
      <Route path="/professional/templates" element={<ProfessionalRoute><ProfessionalTemplatesPage /></ProfessionalRoute>} />
      <Route path="/professional/settings" element={<ProfessionalRoute><ProfessionalSettingsPage /></ProfessionalRoute>} />
      <Route path="/professional/profil" element={<ProfessionalRoute><ProfessionalProfilePage /></ProfessionalRoute>} />
      <Route path="/admin/verzeichnis" element={<ProtectedRoute><AdminDirectoryPage /></ProtectedRoute>} />
      <Route path="/professional/report-templates" element={<ProfessionalRoute><ProfessionalReportTemplatesPage /></ProfessionalRoute>} />
      <Route path="/professional/cases/:caseId" element={<ProfessionalRoute><ProfessionalCaseDetailPage /></ProfessionalRoute>} />
      <Route path="/professional/cases/:caseId/echo" element={<ProfessionalRoute><ProfessionalEchoPage /></ProfessionalRoute>} />
      <Route path="/professional/cases/:caseId/reports/:reportId" element={<ProfessionalRoute><ProfessionalReportDetailPage /></ProfessionalRoute>} />
      <Route path="/professional/paarraum/:coupleId" element={<ProfessionalRoute><ProfCoupleRoomPage /></ProfessionalRoute>} />
      <Route path="/professional/couples/:coupleId/echo" element={<ProfessionalRoute><CoupleEchoPage /></ProfessionalRoute>} />
      <Route path="/professional/couples/:coupleId/reports/:reportId" element={<ProfessionalRoute><CoupleReportDetailPage /></ProfessionalRoute>} />

      {/* ── Ausbildungsbereich · Institut (Login + Rolle erforderlich) ────────── */}
      <Route path="/institute/register" element={<ProtectedRoute><InstituteRegisterPage /></ProtectedRoute>} />
      <Route path="/institute/dashboard" element={<InstituteRoute><InstituteDashboardPage /></InstituteRoute>} />
      <Route path="/institute/cohort" element={<Navigate to="/institute/students?view=status" replace />} />
      <Route path="/institute/examples/new" element={<InstituteRoute><InstituteGeneratePage /></InstituteRoute>} />
      <Route path="/institute/examples/:id" element={<InstituteRoute><InstituteExampleEditorPage /></InstituteRoute>} />
      <Route path="/institute/students" element={<InstituteRoute><InstituteStudentsPage /></InstituteRoute>} />
      <Route path="/institute/submissions" element={<InstituteRoute><InstituteSubmissionsPage /></InstituteRoute>} />
      <Route path="/institute/submissions/:id" element={<InstituteRoute><InstituteSubmissionDetailPage /></InstituteRoute>} />
      <Route path="/institute/rubrics" element={<InstituteRoute><InstituteRubricsPage /></InstituteRoute>} />
      <Route path="/institute/assignments" element={<InstituteRoute><InstituteAssignmentsPage /></InstituteRoute>} />
      <Route path="/institute/assignments/:id" element={<InstituteRoute><InstituteAssignmentDetailPage /></InstituteRoute>} />
      <Route path="/institute/settings" element={<InstituteRoute><InstituteSettingsPage /></InstituteRoute>} />
      <Route path="/institute/marketplace" element={<Navigate to="/institute/modules?view=market" replace />} />
      <Route path="/institute/marketplace/:id" element={<InstituteRoute><InstituteMarketplaceDetailPage /></InstituteRoute>} />
      <Route path="/institute/modules" element={<InstituteRoute><InstituteModulesPage /></InstituteRoute>} />
      <Route path="/institute/modules/:id" element={<InstituteRoute><InstituteModuleDetailPage /></InstituteRoute>} />

      {/* ── Ausbildungsbereich · Student:in (Login + Rolle erforderlich) ──────── */}
      <Route path="/student/register" element={<ProtectedRoute><StudentRegisterPage /></ProtectedRoute>} />
      <Route path="/student/dashboard" element={<StudentRoute><StudentDashboardPage /></StudentRoute>} />
      <Route path="/student/assignments" element={<StudentRoute><StudentAssignmentsPage /></StudentRoute>} />
      <Route path="/student/modules" element={<StudentRoute><StudentModulesPage /></StudentRoute>} />
      <Route path="/student/modules/:id" element={<StudentRoute><StudentModuleDetailPage /></StudentRoute>} />
      <Route path="/student/cases/:id" element={<StudentRoute><StudentCaseDetailPage /></StudentRoute>} />
      <Route path="/student/cases/:id/echo" element={<StudentRoute><StudentEchoPage /></StudentRoute>} />
      <Route path="/student/cases/:id/roleplay" element={<StudentRoute><StudentRoleplayPage /></StudentRoute>} />
      <Route path="/student/cases/:id/hypotheses" element={<StudentRoute><StudentHypothesesPage /></StudentRoute>} />
      <Route path="/student/cases/:id/hypotheses/:hypId" element={<StudentRoute><StudentHypothesisDialogPage /></StudentRoute>} />
      <Route path="/student/cases/:id/scales" element={<StudentRoute><StudentScalesPage /></StudentRoute>} />
      <Route path="/student/cases/:id/review" element={<StudentRoute><StudentReviewPage /></StudentRoute>} />
      <Route path="/student/cases/:id/reports" element={<StudentRoute><StudentReportsPage /></StudentRoute>} />
      <Route path="/student/cases/:id/reports/new" element={<StudentRoute><StudentReportNewPage /></StudentRoute>} />
      <Route path="/student/cases/:id/reports/:reportId" element={<StudentRoute><StudentReportDetailPage /></StudentRoute>} />
      <Route path="/student/cases/:id/notes" element={<StudentRoute><StudentNotesPage /></StudentRoute>} />
      <Route path="/student/cases/:id/couple" element={<StudentRoute><StudentCouplePage /></StudentRoute>} />
      <Route path="/student/cases/:id/submit" element={<StudentRoute><StudentSubmitPage /></StudentRoute>} />

      {/* ── Fallback ───────────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )

  /**
   * Im Browser faengt Suspense das Nachladen ab und zeigt solange den Rueckfall.
   *
   * Beim Prerendering ist genau das falsch: `renderToString` faengt das Promise an der
   * Suspense-Grenze ab und schreibt den (leeren) Rueckfall ins HTML - die Seite waere
   * ausgeliefert, aber inhaltslos. Ohne Grenze wirft React das Promise stattdessen nach
   * oben durch, wo `renderPage` es abwartet und erneut rendert. Siehe entry-server.tsx.
   */
  if (!suspense) return routen
  return <Suspense fallback={<BereichLaedt />}>{routen}</Suspense>
}
