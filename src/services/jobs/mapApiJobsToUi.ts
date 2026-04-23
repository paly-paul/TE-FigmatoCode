import { stableJobNumericId, slugifyLocationId } from "./stableJobId";
import type { CandidateActionableApi, JobApplicationApi, RecommendedJobApi } from "./types";

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
  stage: "Received" | "Shortlisted" | "Interview" | "Rejected";
  postedTime: string;
  skills: string[];
  employmentType: string;
  seniorityLevel: string;
  jobDocumentId?: string;
  appliedDate?: string;
};

export type JobsPageCard = {
  id: number;
  title: string;
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

export function mapRecommendedToDashboardJob(j: RecommendedJobApi): DashboardJobListing {
  const { label, value } = formatBillRateRange(j);
  const locId = slugifyLocationId(j.location);
  const score = Math.round(j.match_score);
  return {
    id: stableJobNumericId(j.job_id),
    title: j.job_title,
    location: j.location,
    locationId: locId,
    locationFull: j.location,
    company: "—",
    salary: label,
    hourlyRate: value,
    startDate: j.rotation ? `Rotation: ${j.rotation}` : "—",
    matchPercentage: score,
    status: recommendedStatusFromScore(score),
    stage: "Received",
    postedTime: j.status || "—",
    skills: j.key_skills ?? [],
    employmentType: j.employment_type || j.billing_frequency || "—",
    seniorityLevel: j.seniority_level || "—",
    jobDocumentId: j.job_id,
  };
}

export function mapRecommendedToJobsPageCard(j: RecommendedJobApi): JobsPageCard {
  const dash = mapRecommendedToDashboardJob(j);
  return {
    id: dash.id,
    title: dash.title,
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

export function mapApplicationToDashboardJob(row: JobApplicationApi): DashboardJobListing {
  const locId = slugifyLocationId(row.job_id);
  return {
    id: stableJobNumericId(row.id + row.job_id),
    title: row.job_title,
    location: "—",
    locationId: locId,
    locationFull: "—",
    company: "—",
    salary: "—",
    hourlyRate: 0,
    startDate: row.date ? `Updated: ${row.date}` : "—",
    matchPercentage: 0,
    status: "New",
    stage: mapApplicationStatusToStage(row.status),
    postedTime: row.date || "—",
    skills: [],
    employmentType: "—",
    seniorityLevel: "—",
    jobDocumentId: row.job_id,
    appliedDate: row.date || undefined,
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
