import { parseApiErrorMessage } from "@/services/signup/parseApiError";
import type { JobApplicationApi, RecommendedJobApi } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeRecommendedJobs(payload: Record<string, unknown>): RecommendedJobApi[] {
  const candidates: unknown[] = [];
  if (Array.isArray(payload.data)) candidates.push(...payload.data);
  if (Array.isArray(payload.message)) candidates.push(...payload.message);
  if (isRecord(payload.data)) {
    const inner = payload.data;
    if (Array.isArray(inner.jobs)) candidates.push(...inner.jobs);
    if (Array.isArray(inner.message)) candidates.push(...inner.message);
  }
  if (isRecord(payload.message)) {
    const inner = payload.message;
    if (Array.isArray(inner.data)) candidates.push(...inner.data);
    if (Array.isArray(inner.jobs)) candidates.push(...inner.jobs);
    if (Array.isArray(inner.message)) candidates.push(...inner.message);
  }

  const output: RecommendedJobApi[] = [];
  for (const item of candidates) {
    if (!isRecord(item)) continue;
    const job_title = typeof item.job_title === "string" ? item.job_title : "";
    const job_id = typeof item.job_id === "string" ? item.job_id : "";
    if (!job_title || !job_id) continue;
    output.push({
      job_title,
      job_id,
      location: typeof item.location === "string" ? item.location : "Unknown",
      minimum_bill_rate:
        typeof item.minimum_bill_rate === "number" ? item.minimum_bill_rate : null,
      maximum_bill_rate:
        typeof item.maximum_bill_rate === "number" ? item.maximum_bill_rate : null,
      billing_currency:
        typeof item.billing_currency === "string" ? item.billing_currency : undefined,
      billing_frequency:
        typeof item.billing_frequency === "string" ? item.billing_frequency : undefined,
      status: typeof item.status === "string" ? item.status : undefined,
      rotation: typeof item.rotation === "string" ? item.rotation : undefined,
      match_score: typeof item.match_score === "number" ? item.match_score : 0,
      action: typeof item.action === "string" ? item.action : undefined,
    });
  }

  return output;
}

async function getJsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function getRecommendedJobs(profileName: string): Promise<RecommendedJobApi[]> {
  const url = new URL("/api/method/get_recommended_jobs", window.location.origin);
  url.searchParams.set("profile_name", profileName.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
  return normalizeRecommendedJobs(data);
}

export async function markInterestedInJob(candidateId: string, jobId: string): Promise<void> {
  const url = new URL("/api/method/im_interested_in_job", window.location.origin);
  url.searchParams.set("candidate_id", candidateId.trim());
  url.searchParams.set("job_id", jobId.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
}

function collectApplicationRows(payload: Record<string, unknown>): Record<string, unknown>[] {
  const buckets: unknown[] = [];
  const push = (v: unknown) => {
    if (v === undefined || v === null) return;
    buckets.push(v);
  };

  push(payload.data);
  push(payload.message);
  if (isRecord(payload.data)) {
    const d = payload.data;
    push(d.applications);
    push(d.job_applications);
    push(d.rows);
    push(d.data);
    push(d.message);
  }
  if (isRecord(payload.message)) {
    const m = payload.message;
    push(m.applications);
    push(m.job_applications);
    push(m.rows);
    push(m.data);
    push(m.message);
  }

  const rows: Record<string, unknown>[] = [];
  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    for (const item of bucket) {
      if (isRecord(item)) rows.push(item);
    }
  }
  return rows;
}

function pickField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function normalizeJobApplications(payload: Record<string, unknown>): JobApplicationApi[] {
  const raw = collectApplicationRows(payload);
  const out: JobApplicationApi[] = [];
  for (const row of raw) {
    const job_title = pickField(row, ["job_title", "job_name", "title", "position"]);
    const job_id = pickField(row, ["job_id", "job_opening", "job", "job_name"]);
    const status = pickField(row, ["status", "stage", "application_status"]) || "Received";
    const id = pickField(row, ["name", "id"]) || "";
    if (!job_title && !job_id) continue;
    out.push({
      id: id || `${job_id || "job"}-${job_title || "application"}`,
      job_title: job_title || job_id,
      job_id: job_id || job_title,
      status,
      date: pickField(row, ["modified", "creation", "date", "applied_on", "posting_date"]),
    });
  }
  return out;
}

export async function getJobApplications(candidateId: string): Promise<JobApplicationApi[]> {
  const url = new URL("/api/method/get_job_application", window.location.origin);
  url.searchParams.set("candidate_id", candidateId.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
  return normalizeJobApplications(data);
}

export async function postProposalCandidateNegotiation(
  proposalName: string,
  remarks: string
): Promise<void> {
  const url = new URL(
    "/api/method/post_proposal_candidate_negotiation",
    window.location.origin
  );
  url.searchParams.set("proposal_name", proposalName.trim());
  url.searchParams.set("candidate_remarks", remarks.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
}

export async function postProposalCandidateAcceptance(
  proposalName: string,
  remarks: string
): Promise<void> {
  const url = new URL(
    "/api/method/post_proposal_candidate_acceptance",
    window.location.origin
  );
  url.searchParams.set("proposal_name", proposalName.trim());
  url.searchParams.set("candidate_remarks", remarks.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
}

type CandidateSourcingAcceptanceInput = {
  rrcandidate_name: string;
  expected_salary?: number;
  billing_frequency?: string;
  billing_currency?: string;
  availability_date?: string;
  accept_terms: boolean;
};

export async function postCandidateSourcingAcceptance(
  input: CandidateSourcingAcceptanceInput
): Promise<void> {
  const url = new URL("/api/method/post_candidate_sourcing_acceptance", window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: input }),
  });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
}
