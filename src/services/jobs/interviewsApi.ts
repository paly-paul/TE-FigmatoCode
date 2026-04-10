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

/** Frappe rows may use `Name` / `RR` casing — match case-insensitively. */
function rowString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const byLower = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    byLower.set(k.toLowerCase(), v);
  }
  for (const key of keys) {
    const v = byLower.get(key.toLowerCase());
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Job Opening / RR document ids: RR-{yy}-{suffix…} — never use as Interview `name`. */
export function isLikelyJobOpeningDocName(value: string): boolean {
  const compact = value.replace(/\s+/g, "");
  return /^RR-\d{2}-\d+/i.test(compact);
}

/**
 * Prefer drawer-resolved id (from get_interviews_by_profile row `name`) over card fields.
 * Never submit a Job Opening id (RR-…) as interview_id.
 */
export function pickInterviewIdForSlotSubmit(options: {
  resolvedInterviewId?: string | null;
  explicitCardInterviewId?: string | null;
  actionableRecordName?: string | null;
}): string | undefined {
  const resolved = options.resolvedInterviewId?.trim() || "";
  if (resolved && !isLikelyJobOpeningDocName(resolved)) {
    return resolved;
  }
  return (
    coalesceInterviewDocumentId({
      explicitInterviewId: options.explicitCardInterviewId,
      resolvedFromProfile: null,
      actionableRecordName: options.actionableRecordName,
    }) ?? undefined
  );
}

/**
 * Pick the Interview document name to send to slot APIs.
 * `get_candidate_actionables` uses top-level `name` as the Interview document id (e.g. INT-00001);
 * that value is passed as `actionableRecordName` (dashboard `proposalName`). Prefer it over
 * `info.interview_id`, which may be absent or stale.
 */
export function coalesceInterviewDocumentId(options: {
  explicitInterviewId?: string | null;
  resolvedFromProfile?: string | null;
  actionableRecordName?: string | null;
}): string | null {
  const explicit = options.explicitInterviewId?.trim() || "";
  const explicitOk = explicit && !isLikelyJobOpeningDocName(explicit) ? explicit : "";

  const fromProfile = options.resolvedFromProfile?.trim() || "";
  const fromProfileOk = fromProfile && !isLikelyJobOpeningDocName(fromProfile) ? fromProfile : "";

  const actionable = options.actionableRecordName?.trim() || "";
  const actionableOk = actionable && !isLikelyJobOpeningDocName(actionable) ? actionable : "";

  if (actionableOk) return actionableOk;
  if (explicitOk) return explicitOk;
  if (fromProfileOk) return fromProfileOk;
  if (actionable) return actionable;
  if (fromProfile) return fromProfile;
  return null;
}

function collectObjectArrays(payload: Record<string, unknown>): Record<string, unknown>[] {
  const buckets: unknown[] = [];
  const push = (v: unknown) => {
    if (v === undefined || v === null) return;
    buckets.push(v);
  };

  push(payload.data);
  push(payload.message);
  push((payload as { result?: unknown }).result);
  if (isRecord(payload.data)) {
    const d = payload.data;
    push(d.interviews);
    push(d.slots);
    /** Doc shape: top-level `data.available_slots` or nested under `data.data`. */
    push(d.available_slots);
    push(d.interview_slots);
    push(d.data);
    push(d.message);
    push(d.rows);
    push((d as { result?: unknown }).result);
    const innerData = d.data;
    if (isRecord(innerData) && !Array.isArray(innerData)) {
      push(innerData.available_slots);
      push(innerData.interview_slots);
    }
  }
  if (isRecord(payload.message)) {
    const m = payload.message;
    push(m.interviews);
    push(m.slots);
    push(m.available_slots);
    push(m.interview_slots);
    push(m.data);
    push(m.message);
    push(m.rows);
    push((m as { result?: unknown }).result);
    const msgData = m.data;
    if (isRecord(msgData) && !Array.isArray(msgData)) {
      push(msgData.available_slots);
      push(msgData.interview_slots);
    }
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

/** Frappe sometimes returns one interview as `message.data` (object), not `data: [...]`. */
function extractSingleInterviewObjectRows(payload: Record<string, unknown>): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const tryNode = (node: unknown) => {
    if (!isRecord(node) || Array.isArray(node)) return;
    const looksLikeInterviewRow =
      Boolean(rowString(node, ["interview_id", "interview", "interview_name"])) ||
      (Boolean(rowString(node, ["name", "id"])) &&
        Boolean(rowString(node, ["job_id", "job_opening", "job", "job_name", "rr"])));
    if (looksLikeInterviewRow) out.push(node);
  };
  tryNode(payload.data);
  if (isRecord(payload.message)) {
    const m = payload.message as Record<string, unknown>;
    tryNode(m.data);
  }
  return out;
}

/** Normalized from get_interviews_by_profile: `name` → interview_id, `rr` → job_id (Job Opening). */
export type ProfileInterviewApi = {
  interview_id: string;
  /** Job Opening / RR document id (from `rr`, `job_id`, etc.). */
  job_id: string;
};

function normalizeInterviews(payload: Record<string, unknown>): ProfileInterviewApi[] {
  const raw = [...extractSingleInterviewObjectRows(payload), ...collectObjectArrays(payload)];
  const seen = new Set<string>();
  const out: ProfileInterviewApi[] = [];
  for (const row of raw) {
    const explicitInterview = rowString(row, [
      "interview_id",
      "interview",
      "interview_name",
    ]);
    const nameOrId = rowString(row, ["name", "id"]);
    const interview_id =
      explicitInterview ||
      (nameOrId && !isLikelyJobOpeningDocName(nameOrId) ? nameOrId : "");
    if (!interview_id) continue;
    const job_id = rowString(row, [
      "rr",
      "job_id",
      "job_opening",
      "job",
      "job_name",
      "job_title",
    ]);
    if (seen.has(interview_id)) continue;
    seen.add(interview_id);
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

function isFrappeLogicalFailure(data: Record<string, unknown>): boolean {
  const root = typeof data.status === "string" ? data.status.toLowerCase() : "";
  if (root === "failed" || root === "error") return true;
  const msg = data.message;
  if (msg && typeof msg === "object") {
    const st = typeof (msg as { status?: string }).status === "string"
      ? (msg as { status: string }).status.toLowerCase()
      : "";
    if (st === "failed" || st === "error") return true;
  }
  return false;
}

export async function getInterviewsByProfile(profileId: string): Promise<ProfileInterviewApi[]> {
  const url = new URL("/api/method/get_interviews_by_profile", window.location.origin);
  url.searchParams.set("profile_id", profileId.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok || isFrappeLogicalFailure(data)) {
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
  if (!res.ok || isFrappeLogicalFailure(data)) {
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
  if (!res.ok || isFrappeLogicalFailure(data)) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
}

export function resolveInterviewIdForJob(
  interviews: ProfileInterviewApi[],
  jobId: string
): string | null {
  const needle = jobId.trim();
  if (!needle) return null;
  const matchesJob = interviews.filter((row) => row.job_id === needle);
  const pool = matchesJob.length ? matchesJob : interviews;
  const row = pool.find(
    (r) => r.interview_id && !isLikelyJobOpeningDocName(r.interview_id)
  );
  return row?.interview_id ?? null;
}

const MAX_SLOT_PROBE_CANDIDATES = 12;

/**
 * When actionables embed slots but omit interview_id, the real Interview name may not match
 * actionable `name`. Probe get_available_slots_by_interview until we find an interview that lists
 * the given slot (slot doc `name` / `slot_id`).
 */
export async function resolveInterviewIdBySlotOwnership(options: {
  profileId: string;
  jobId: string;
  slotId: string;
  explicitInterviewId?: string | null;
  actionableRecordName?: string | null;
}): Promise<string | null> {
  const slotNeedle = options.slotId.trim();
  if (!slotNeedle) return null;

  let list: ProfileInterviewApi[] = [];
  try {
    list = await getInterviewsByProfile(options.profileId.trim());
  } catch {
    list = [];
  }

  const fromProfile = resolveInterviewIdForJob(list, options.jobId.trim());

  const ordered: string[] = [];
  const add = (v: string | null | undefined) => {
    const t = v?.trim();
    if (!t) return;
    if (ordered.includes(t)) return;
    ordered.push(t);
  };

  add(
    coalesceInterviewDocumentId({
      explicitInterviewId: options.explicitInterviewId,
      resolvedFromProfile: fromProfile,
      actionableRecordName: options.actionableRecordName,
    })
  );
  add(options.explicitInterviewId);
  add(fromProfile);
  add(options.actionableRecordName);
  for (const row of list) {
    add(row.interview_id);
  }

  const candidates = ordered
    .filter((id) => id && !isLikelyJobOpeningDocName(id))
    .slice(0, MAX_SLOT_PROBE_CANDIDATES);

  const actionable = options.actionableRecordName?.trim() || "";

  for (const interviewId of candidates) {
    try {
      const slots = await getAvailableInterviewSlots(interviewId);
      if (slots.some((s) => s.slot_id.trim() === slotNeedle)) {
        return interviewId;
      }
    } catch {
      /* wrong interview or not in slot-selection state */
    }
  }

  // Second pass: listing may omit "Proposed" slots; if slots API accepts this interview, use actionable name.
  if (actionable && !isLikelyJobOpeningDocName(actionable)) {
    try {
      await getAvailableInterviewSlots(actionable);
      return actionable;
    } catch {
      /* interview invalid or not awaiting slot acceptance */
    }
  }

  return null;
}
