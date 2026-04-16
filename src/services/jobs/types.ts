export type RecommendedJobApi = {
  job_title: string;
  job_id: string;
  location: string;
  minimum_bill_rate: number | null;
  maximum_bill_rate: number | null;
  billing_currency?: string;
  billing_frequency?: string;
  status?: string;
  rotation?: string;
  match_score: number;
  action?: string;
};

export type JobApplicationApi = {
  id: string;
  job_title: string;
  job_id: string;
  status: string;
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

export type CandidateActionableApi = {
  job_title: string;
  job_id: string;
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
