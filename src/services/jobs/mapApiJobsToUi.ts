import { stableJobNumericId, slugifyLocationId } from "./stableJobId";
import type { CandidateActionableApi, CandidateInterestApi, JobApplicationApi, RecommendedJobApi } from "./types";

export type DashboardJobListing = {
  id: number;
  title: string;
  location: string;
  locationId: string;
  locationFull: string;
  company: string;
  salary: string;
  hourlyRate: number;
  startDate: string;
  matchPercentage: number;
  status: "Strong Match" | "Closing Soon" | "Early Applicants" | "New";
  stage: string;
  postedTime: string;
  skills: string[];
  employmentType: string;
  seniorityLevel: string;
  jobDocumentId?: string;
  appliedDate?: string;
  applicationSalary?: number;
  rrCandidateId?: string;
};

export type JobsPageCard = {
  id: number;
  title: string;
  /** Same as API `customer` (hiring organization). */
  company: string;
  status: "Strong Match" | "Closing Soon" | "Early Applicants" | "New";
  postedTime: string;
  location: string;
  locationId: string;
  locationFull: string;
  compensation: string;
  compensationValue: number;
  startDate: string;
  matchPercentage: number;
  skills: string[];
  qualifications: string[];
  languages: string[];
  projects: string[];
  visaRequirements: string[];
  nationalities: string[];
  employmentType: string;
  seniorityLevel: string;
  jobDocumentId?: string;
};

export type ActionCenterCard = {
  id: number;
  type: "Job" | "Profile" | "General";
  title: string;
  subtitle: string;
  timestamp: string;
  jobDocumentId?: string;
  matchScore?: number;
};

function parseLocation(raw?: string): { city: string; country: string } {
  if (!raw || raw.trim() === "—") return { city: "", country: "" };
  const idx = raw.indexOf(",");
  if (idx !== -1) {
    return { city: raw.slice(0, idx).trim(), country: raw.slice(idx + 1).trim() };
  }
  return { city: raw.trim(), country: "" };
}

function formatRelativeDaysAgo(date?: string): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  const diffDays = Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function recommendedStatusFromScore(score: number): DashboardJobListing["status"] {
  if (score >= 85) return "Strong Match";
  if (score >= 70) return "Early Applicants";
  if (score >= 55) return "Closing Soon";
  return "New";
}

function formatBillRateRange(j: RecommendedJobApi): { label: string; value: number } {
  const cur = j.billing_currency?.trim() || "USD";
  const min = j.minimum_bill_rate;
  const max = j.maximum_bill_rate;
  const freq = j.billing_frequency?.trim() || "monthly";
  const freqShort = freq.toLowerCase().includes("hour")
    ? "hourly"
    : freq.toLowerCase().includes("day")
      ? "daily"
      : "monthly";

  if (min != null && max != null) {
    if (min === max) {
      return {
        label: `${cur} ${max.toLocaleString()} / ${freqShort}`,
        value: max,
      };
    }
    return {
      label: `${cur} ${min.toLocaleString()} – ${max.toLocaleString()} / ${freqShort}`,
      value: max,
    };
  }
  if (max != null) {
    return {
      label: `${cur} ${max.toLocaleString()} / ${freqShort}`,
      value: max,
    };
  }
  return { label: "—", value: 0 };
}

function billingFrequencyLabel(j: RecommendedJobApi): string {
  const source = (j.billing_frequency || j.employment_type || "").trim().toLowerCase();
  if (source.includes("hour")) return "Hourly";
  if (source.includes("month")) return "Monthly";
  return "—";
}

function rotationYesNo(j: RecommendedJobApi): string {
  if (j.is_rotation === 1) return "Yes";
  if (j.is_rotation === 0) return "No";
  const normalized = (j.seniority_level || "").trim().toLowerCase();
  if (normalized === "yes" || normalized === "true" || normalized === "1") return "Yes";
  if (
    normalized === "no" ||
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no rotation"
  ) {
    return "No";
  }
  const rotationText = (j.rotation || "").trim().toLowerCase();
  if (rotationText === "yes" || rotationText === "true" || rotationText === "1") return "Yes";
  if (rotationText === "no" || rotationText === "false" || rotationText === "0") return "No";
  if (rotationText.includes("no rotation")) return "No";
  if (rotationText.includes("0 weeks on / 0 weeks off")) return "No";
  if (rotationText) return "Yes";
  return "No";
}

export function mapRecommendedToDashboardJob(j: RecommendedJobApi): DashboardJobListing {
  const { label, value } = formatBillRateRange(j);
  const locId = slugifyLocationId(j.location);
  const score = Math.round(j.match_score);
  const loc = parseLocation(j.location);
  return {
    id: stableJobNumericId(j.job_id),
    title: j.job_title,
    location: loc.city,
    locationId: locId,
    locationFull: loc.country,
    company: j.customer || "—",
    salary: label,
    hourlyRate: value,
    startDate: j.rotation ? `Rotation: ${j.rotation}` : "—",
    matchPercentage: score,
    status: recommendedStatusFromScore(score),
    stage: "Received",
    postedTime: j.status || j.posted_time || formatRelativeDaysAgo(j.creation),
    skills: j.key_skills ?? [],
    employmentType: billingFrequencyLabel(j),
    seniorityLevel: rotationYesNo(j),
    jobDocumentId: j.job_id,
  };
}

export function mapRecommendedToJobsPageCard(j: RecommendedJobApi): JobsPageCard {
  const dash = mapRecommendedToDashboardJob(j);
  return {
    id: dash.id,
    title: dash.title,
    company: dash.company,
    status: dash.status,
    postedTime: dash.postedTime,
    location: dash.location,
    locationId: dash.locationId,
    locationFull: dash.locationFull,
    compensation: dash.salary,
    compensationValue: dash.hourlyRate,
    startDate: dash.startDate,
    matchPercentage: dash.matchPercentage,
    skills: j.key_skills ?? [],
    qualifications: j.qualification ?? [],
    languages: j.language_requirement ?? [],
    projects: j.project ?? [],
    visaRequirements: j.visa_requirements ?? [],
    nationalities: j.nationality ?? [],
    employmentType: dash.employmentType,
    seniorityLevel: dash.seniorityLevel,
    jobDocumentId: j.job_id,
  };
}

function mapApplicationStatusToStage(status: string): DashboardJobListing["stage"] {
  const u = status.toLowerCase();
  if (u.includes("shortlist")) return "Shortlisted";
  if (u.includes("interview")) return "Interview";
  if (u.includes("reject")) return "Rejected";
  return "Received";
}

function coerceMatchPercent(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = value.trim();
    let n = Number(t);
    if (Number.isFinite(n)) return n;
    n = Number(t.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function mapApplicationToDashboardJob(row: JobApplicationApi): DashboardJobListing {
  const locId = slugifyLocationId(row.job_id);
  const score = coerceMatchPercent(row.score);
  const resolvedStage = /reject/i.test(row.status || "")
    ? "Rejected"
    : (row.stage || "").trim() || mapApplicationStatusToStage(row.status);
  return {
    id: stableJobNumericId(row.id + row.job_id),
    title: row.job_title,
    location: "—",
    locationId: locId,
    locationFull: "—",
    company: row.company?.trim() || "—",
    salary: row.salary != null ? `$${row.salary.toLocaleString()}` : "—",
    hourlyRate: 0,
    startDate: row.date ? `Updated: ${row.date}` : "—",
    matchPercentage: Math.max(0, Math.min(100, Math.round(score))),
    status: "New",
    stage: resolvedStage,
    postedTime: formatRelativeDaysAgo(row.date),
    skills: [],
    employmentType: "—",
    seniorityLevel: "—",
    jobDocumentId: row.job_id,
    appliedDate: row.date || undefined,
    applicationSalary: row.salary,
    rrCandidateId: row.id || undefined,
  };
}

export function mapCandidateInterestToDashboardJob(item: CandidateInterestApi): DashboardJobListing {
  const locId = slugifyLocationId(item.location || item.rr);
  const score = coerceMatchPercent(item.score);
  const loc = parseLocation(item.location);
  const stage = item.stage?.trim() || "Applied";
  return {
    id: stableJobNumericId(item.candidate_interest_for_rr + item.rr),
    title: item.job_title || item.rr,
    location: loc.city,
    locationId: locId,
    locationFull: loc.country,
    company: item.customer || "—",
    salary: item.expected_salary != null ? `$${item.expected_salary.toLocaleString()}` : "—",
    hourlyRate: 0,
    startDate: "—",
    matchPercentage: Math.max(0, Math.min(100, Math.round(score))),
    status: "New",
    stage,
    postedTime: item.updated_date ? formatRelativeDaysAgo(item.updated_date) : "—",
    skills: [],
    employmentType: "—",
    seniorityLevel: "—",
    jobDocumentId: item.rr,
    appliedDate: item.updated_date || undefined,
    rrCandidateId: item.rr_candidate || undefined,
  };
}

function firstSlotTimestamp(info: CandidateActionableApi["info"]): string {
  const slots = info?.interview_slots;
  if (!Array.isArray(slots) || slots.length === 0) return "";
  const s = slots[0];
  if (!s || typeof s !== "object") return "";
  const d = (s as { slot_date?: string; slot_time?: string }).slot_date;
  const t = (s as { slot_time?: string }).slot_time;
  if (d && t) return `${d} ${t}`;
  return d || t || "";
}

export function mapActionableToActionCard(a: CandidateActionableApi): ActionCenterCard {
  const slotHint = firstSlotTimestamp(a.info);
  return {
    id: stableJobNumericId(a.name + a.job_id),
    type: "Job",
    title: a.status || a.stage,
    subtitle: `${a.job_title} — ${a.job_id}`,
    timestamp: slotHint || a.stage,
    jobDocumentId: a.job_id,
  };
}
