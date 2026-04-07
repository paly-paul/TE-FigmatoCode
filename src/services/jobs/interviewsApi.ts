import { parseApiErrorMessage } from "@/services/signup/parseApiError";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function getJsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function firstNonEmptyString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function collectObjectArrays(payload: Record<string, unknown>): Record<string, unknown>[] {
  const buckets: unknown[] = [];
  const push = (v: unknown) => {
    if (v === undefined || v === null) return;
    buckets.push(v);
  };

  push(payload.data);
  push(payload.message);
  if (isRecord(payload.data)) {
    const d = payload.data;
    push(d.interviews);
    push(d.slots);
    push(d.data);
    push(d.message);
    push(d.rows);
  }
  if (isRecord(payload.message)) {
    const m = payload.message;
    push(m.interviews);
    push(m.slots);
    push(m.data);
    push(m.message);
    push(m.rows);
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

export type ProfileInterviewApi = {
  interview_id: string;
  job_id: string;
};

function normalizeInterviews(payload: Record<string, unknown>): ProfileInterviewApi[] {
  const raw = collectObjectArrays(payload);
  const out: ProfileInterviewApi[] = [];
  for (const row of raw) {
    const interview_id = firstNonEmptyString(row, [
      "interview_id",
      "name",
      "interview",
      "interview_name",
      "id",
    ]);
    if (!interview_id) continue;
    const job_id = firstNonEmptyString(row, [
      "job_id",
      "job_opening",
      "job",
      "job_name",
      "job_title",
    ]);
    out.push({ interview_id, job_id });
  }
  return out;
}

export type InterviewSlotOptionApi = {
  slot_id: string;
  slot_date: string;
  slot_time: string;
  label: string;
};

function normalizeSlots(payload: Record<string, unknown>): InterviewSlotOptionApi[] {
  const raw = collectObjectArrays(payload);
  const out: InterviewSlotOptionApi[] = [];
  for (const row of raw) {
    const slot_id = firstNonEmptyString(row, ["slot_id", "name", "id"]);
    if (!slot_id) continue;
    const slot_date = firstNonEmptyString(row, ["slot_date", "date", "scheduled_date"]);
    const slot_time = firstNonEmptyString(row, ["slot_time", "time", "from_time", "start_time"]);
    const label =
      firstNonEmptyString(row, ["label", "title", "slot_label"]) ||
      [slot_date, slot_time].filter(Boolean).join(" ") ||
      slot_id;
    out.push({ slot_id, slot_date, slot_time, label });
  }
  return out;
}

export async function getInterviewsByProfile(profileId: string): Promise<ProfileInterviewApi[]> {
  const url = new URL("/api/method/get_interviews_by_profile", window.location.origin);
  url.searchParams.set("profile_id", profileId.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
  return normalizeInterviews(data);
}

export async function getAvailableInterviewSlots(
  interviewId: string
): Promise<InterviewSlotOptionApi[]> {
  const url = new URL("/api/method/get_available_slots_by_interview", window.location.origin);
  url.searchParams.set("interview_id", interviewId.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
  return normalizeSlots(data);
}

export async function postInterviewSelectSlot(
  interviewId: string,
  slotId: string
): Promise<void> {
  const url = new URL("/api/method/post_interview_select_slot", window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      interview_id: interviewId.trim(),
      slot_id: slotId.trim(),
    }),
  });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
}

export function resolveInterviewIdForJob(
  interviews: ProfileInterviewApi[],
  jobId: string
): string | null {
  const needle = jobId.trim();
  if (!needle) return null;
  const direct = interviews.find(
    (row) => row.job_id === needle || row.interview_id === needle
  );
  if (direct) return direct.interview_id;
  return interviews[0]?.interview_id ?? null;
}
