export type RecommendedJobApi = {
  job_title: string;
  job_id: string;
  location: string;
  minimum_bill_rate: number | null;
  maximum_bill_rate: number | null;
  billing_currency?: string;
  billing_frequency?: string;
  key_skills?: string[];
  qualification?: string[];
  language_requirement?: string[];
  project?: string[];
  visa_requirements?: string[];
  nationality?: string[];
  employment_type?: string;
  seniority_level?: string;
  is_rotation?: number | null;
  status?: string;
  rotation?: string;
  match_score: number;
  action?: string;
  customer?: string;
  /** Pre-formatted "X days ago" string returned by the backend (same value the drawer uses). */
  posted_time?: string;
  /** Raw creation / posting date from the backend (ISO string). Fallback for posted_time. */
  creation?: string;
};

export type JobApplicationApi = {
  id: string;
  job_title: string;
  job_id: string;
  status: string;
  company?: string;
  stage?: string;
  score?: number;
  date?: string;
};

export type CandidateActionableSlotApi = {
  slot_id?: string;
  slot_date?: string;
  slot_time?: string;
  slot_timezone?: string;
  slot_status?: string;
};

export type CandidateActionableInfoApi = {
  interview_id?: string;
  interview_mode?: string;
  interview_type?: string;
  interview_round?: number;
  interview_slots?: CandidateActionableSlotApi[];
};

export type CandidateInterestApi = {
  candidate_interest_for_rr: string;
  rr: string;
  profile: string;
  customer: string;
  job_title: string;
  location: string;
  score?: number;
};

export type CandidateActionableApi = {
  job_title: string;
  job_id: string;
  /** When `"interview"`, the dashboard shows this row under Action Center → Interviews (slot workflow). */
  action?: string;
  customer?: string;
  rr_candidate: string;
  stage: string;
  status: string;
  /** Recruiter interest accepted timestamp (when available). */
  accepted_at?: string;
  /** Raw actionable received/created timestamp when returned by backend. */
  received_at?: string;
  /** Doc name for this actionable row: Interview id (e.g. INT-00001) when stage is interview; proposal id when selection/proposal. */
  name: string;
  info?: CandidateActionableInfoApi;
};
