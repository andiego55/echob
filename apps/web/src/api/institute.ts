import { apiClient } from './client'
import type {
  InstituteProfile,
  GenerationInput,
  GenerationStart,
  GenerationStatus,
  ExampleDetail,
  ExampleSummary,
  InstituteStudent,
  StudentInvite,
  InstituteSubmission,
  InstituteSubmissionDetail,
  Rubric,
  RubricInput,
  SubmissionScore,
  AiEvaluation,
  Assignment,
  AssignmentDetail,
  AssignmentInput,
  InstituteEchoSettings,
  LearningModule,
  LearningModuleDetail,
  ModuleInput,
  ModuleStep,
  ModuleStepInput,
  DidacticsResult,
} from '@/types'

export interface CohortStudent {
  id: string
  display_name: string
  assignments_open: number
  assignments_pending: number
  assignments_overdue: number
  assignments_reviewed: number
  assignments_total: number
  submissions_pending: number
  submissions_total: number
  modules_active: number
  modules_completed: number
  cases: number
}

export interface CohortOverview {
  totals: {
    students: number
    submissions_pending: number
    assignments_pending: number
    assignments_overdue: number
    modules_active: number
    modules_completed: number
  }
  students: CohortStudent[]
}

/** Ausbildungsinstitut (eigene Domäne, /institute/*). */
export const instituteApi = {
  me: () =>
    apiClient.get<InstituteProfile>('/institute/me').then(r => r.data),
  cohort: () =>
    apiClient.get<CohortOverview>('/institute/cohort').then(r => r.data),
  register: (data: { name: string; contact_name?: string | null; access_code: string }) =>
    apiClient.post<InstituteProfile>('/institute/register', data).then(r => r.data),
  updateMe: (data: { name?: string; contact_name?: string | null }) =>
    apiClient.patch<InstituteProfile>('/institute/me', data).then(r => r.data),

  // Beispielfälle (KI-Generierung) — asynchron: start liefert eine generation_id,
  // Status wird gepollt (die Generierung läuft im Hintergrund weiter).
  generateExample: (input: GenerationInput) =>
    apiClient.post<GenerationStart>('/institute/examples/generate', input).then(r => r.data),
  getGeneration: (id: string) =>
    apiClient.get<GenerationStatus>(`/institute/examples/generations/${id}`).then(r => r.data),
  listExamples: () =>
    apiClient.get<ExampleSummary[]>('/institute/examples').then(r => r.data),
  getExample: (id: string) =>
    apiClient.get<ExampleDetail>(`/institute/examples/${id}`).then(r => r.data),
  patchExample: (id: string, data: { title?: string; status?: string; master_solution?: string | null }) =>
    apiClient.patch<ExampleDetail>(`/institute/examples/${id}`, data).then(r => r.data),
  exampleMasterSolutionDraft: (id: string) =>
    apiClient.post<{ master_solution: string }>(`/institute/examples/${id}/master-solution/draft`, undefined, { timeout: 120_000 }).then(r => r.data),
  deleteExample: (id: string) =>
    apiClient.delete(`/institute/examples/${id}`).then(r => r.data),

  // Studierende (Einladungen + Verwaltung)
  listStudents: () =>
    apiClient.get<{ quota: number; students: InstituteStudent[]; invites: StudentInvite[] }>('/institute/students').then(r => r.data),
  inviteStudent: (label?: string | null) =>
    apiClient.post<StudentInvite>('/institute/students/invite', { label }).then(r => r.data),
  removeStudent: (id: string) =>
    apiClient.delete(`/institute/students/${id}`).then(r => r.data),
  revokeStudentInvite: (id: string) =>
    apiClient.delete(`/institute/student-invites/${id}`).then(r => r.data),

  // Freigabe eines Beispiels an Studierende (Klon je Student)
  assignExample: (id: string, studentIds: string[]) =>
    apiClient.post<{ assigned: string[] }>(`/institute/examples/${id}/assign`, { student_ids: studentIds }).then(r => r.data),
  exampleAssignments: (id: string) =>
    apiClient.get<{ student_ids: string[] }>(`/institute/examples/${id}/assignments`).then(r => r.data),

  // Einreichungen der Studierenden (Inbox)
  submissions: () =>
    apiClient.get<InstituteSubmission[]>('/institute/submissions').then(r => r.data),
  submission: (id: string) =>
    apiClient.get<InstituteSubmissionDetail>(`/institute/submissions/${id}`).then(r => r.data),
  reviewSubmission: (id: string, data: { feedback: string | null; rubric_id?: string | null; scores?: SubmissionScore[]; total_points?: number | null }) =>
    apiClient.post<{ reviewed: boolean }>(`/institute/submissions/${id}/feedback`, data).then(r => r.data),
  aiEvaluate: (id: string, rubricId: string) =>
    apiClient.post<AiEvaluation>(`/institute/submissions/${id}/ai-evaluate`, { rubric_id: rubricId }, { timeout: 120_000 }).then(r => r.data),

  // Bewertungsraster (Rubrics)
  rubrics: () =>
    apiClient.get<Rubric[]>('/institute/rubrics').then(r => r.data),
  rubric: (id: string) =>
    apiClient.get<Rubric>(`/institute/rubrics/${id}`).then(r => r.data),
  rubricCreate: (data: RubricInput) =>
    apiClient.post<Rubric>('/institute/rubrics', data).then(r => r.data),
  rubricUpdate: (id: string, data: RubricInput) =>
    apiClient.patch<Rubric>(`/institute/rubrics/${id}`, data).then(r => r.data),
  rubricDelete: (id: string) =>
    apiClient.delete(`/institute/rubrics/${id}`).then(r => r.data),

  // Aufgaben / Zuweisungen
  assignments: () =>
    apiClient.get<Assignment[]>('/institute/assignments').then(r => r.data),
  assignment: (id: string) =>
    apiClient.get<AssignmentDetail>(`/institute/assignments/${id}`).then(r => r.data),
  assignmentCreate: (data: AssignmentInput) =>
    apiClient.post<Assignment>('/institute/assignments', data).then(r => r.data),
  assignmentUpdate: (id: string, data: AssignmentInput) =>
    apiClient.patch<Assignment>(`/institute/assignments/${id}`, data).then(r => r.data),
  assignmentDelete: (id: string) =>
    apiClient.delete(`/institute/assignments/${id}`).then(r => r.data),
  assignmentAssign: (id: string, data: { student_ids?: string[]; to_all?: boolean }) =>
    apiClient.post<{ assigned: number }>(`/institute/assignments/${id}/assign`, data).then(r => r.data),
  reviewStudentAssignment: (saId: string, data: { feedback: string | null; scores?: SubmissionScore[]; total_points?: number | null }) =>
    apiClient.post<{ reviewed: boolean }>(`/institute/student-assignments/${saId}/feedback`, data).then(r => r.data),
  aiEvaluateAssignment: (saId: string, rubricId: string) =>
    apiClient.post<AiEvaluation>(`/institute/student-assignments/${saId}/ai-evaluate`, { rubric_id: rubricId }, { timeout: 120_000 }).then(r => r.data),

  // KI-Aussteuerung (Haus-Stil)
  echoSettings: () =>
    apiClient.get<InstituteEchoSettings>('/institute/echo-settings').then(r => r.data),
  echoSettingsUpdate: (data: InstituteEchoSettings) =>
    apiClient.patch<InstituteEchoSettings>('/institute/echo-settings', data).then(r => r.data),

  // Lernmodule
  modules: () =>
    apiClient.get<LearningModule[]>('/institute/modules').then(r => r.data),
  module: (id: string) =>
    apiClient.get<LearningModuleDetail>(`/institute/modules/${id}`).then(r => r.data),
  moduleCreate: (data: ModuleInput) =>
    apiClient.post<LearningModule>('/institute/modules', data).then(r => r.data),
  moduleUpdate: (id: string, data: ModuleInput) =>
    apiClient.patch<LearningModule>(`/institute/modules/${id}`, data).then(r => r.data),
  moduleDelete: (id: string) =>
    apiClient.delete(`/institute/modules/${id}`).then(r => r.data),
  moduleStepAdd: (id: string, data: ModuleStepInput) =>
    apiClient.post<ModuleStep>(`/institute/modules/${id}/steps`, data).then(r => r.data),
  moduleStepUpdate: (id: string, stepId: string, data: ModuleStepInput) =>
    apiClient.patch<ModuleStep>(`/institute/modules/${id}/steps/${stepId}`, data).then(r => r.data),
  moduleStepDelete: (id: string, stepId: string) =>
    apiClient.delete(`/institute/modules/${id}/steps/${stepId}`).then(r => r.data),
  moduleStepsReorder: (id: string, stepIds: string[]) =>
    apiClient.post(`/institute/modules/${id}/steps/reorder`, { step_ids: stepIds }).then(r => r.data),
  moduleEnroll: (id: string, data: { student_ids?: string[]; to_all?: boolean }) =>
    apiClient.post<{ enrolled: number }>(`/institute/modules/${id}/enroll`, data).then(r => r.data),

  // Didaktik-Assistent (Vorschläge aus einem Fall)
  exampleDidactics: (exampleId: string) =>
    apiClient.post<DidacticsResult>(`/institute/examples/${exampleId}/didactics`, undefined, { timeout: 120_000 }).then(r => r.data),
}
