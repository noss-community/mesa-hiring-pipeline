export type Role = 'PM' | 'SPM'

export interface CriterionScore {
  score: number
  reason: string
}

export interface RoleScores {
  c1: CriterionScore
  c2: CriterionScore
  c3: CriterionScore
  c4: CriterionScore
}

export interface RawScores {
  pm: RoleScores
  spm: RoleScores
}

export interface Candidate {
  id: string
  role: Role
  cv_text: string

  pm_c1_score: number | null
  pm_c1_reason: string | null
  pm_c2_score: number | null
  pm_c2_reason: string | null
  pm_c3_score: number | null
  pm_c3_reason: string | null
  pm_c4_score: number | null
  pm_c4_reason: string | null
  pm_total: number | null
  pm_pass: boolean | null
  pm_flag: string | null

  spm_c1_score: number | null
  spm_c1_reason: string | null
  spm_c2_score: number | null
  spm_c2_reason: string | null
  spm_c3_score: number | null
  spm_c3_reason: string | null
  spm_c4_score: number | null
  spm_c4_reason: string | null
  spm_total: number | null
  spm_pass: boolean | null
  spm_flag: string | null

  interview_brief: string | null
  email_draft: string | null
  email_sent: boolean
  email_sent_at: string | null

  status: 'pending' | 'scoring' | 'scored' | 'error'
  error_message: string | null
  created_at: string

  // joined from candidate_pii
  candidate_pii?: { name: string | null; email: string; phone: string | null }[]
}
