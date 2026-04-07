import { parseApiErrorMessage } from "@/services/signup/parseApiError";
import type { CandidateActionableApi, CandidateActionableInfoApi } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function firstString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeActionableInfo(
  raw: Record<string, unknown> | undefined
): CandidateActionableInfoApi | undefined {
  if (!raw) return undefined;
  const interview_id = firstString(raw, ["interview_id", "interview", "interview_name"]);
  const interview_mode = firstString(raw, ["interview_mode"]);
  const interview_type = firstString(raw, ["interview_type"]);
  const interview_round =
    typeof raw.interview_round === "number" ? raw.interview_round : undefined;
  const slotsRaw = raw.interview_slots;
  let interview_slots: CandidateActionableInfoApi["interview_slots"];
  if (Array.isArray(slotsRaw)) {
    interview_slots = slotsRaw
      .filter(isRecord)
      .map((s) => ({
        slot_id: firstString(s, ["slot_id", "name", "id"]),
        slot_date: firstString(s, ["slot_date", "date"]),
        slot_time: firstString(s, ["slot_time", "time"]),
        slot_timezone: firstString(s, ["slot_timezone", "timezone"]),
        slot_status: firstString(s, ["slot_status", "status"]),
      }));
  }
  const hasAny =
    interview_id ||
    interview_mode ||
    interview_type ||
    interview_round != null ||
    (interview_slots && interview_slots.length > 0);
  if (!hasAny) return undefined;
  return {
    interview_id,
    interview_mode,
    interview_type,
    interview_round,
    interview_slots,
  };
}

function parseActionablesPayload(data: Record<string, unknown>): {
  actions: CandidateActionableApi[];
  partialFailure: boolean;
} {
  // Backend can return either:
  // 1) { status, data: { actions }, partial_failure }
  // 2) { message: { status, data: { actions }, partial_failure } } (Frappe-wrapped)
  const root = isRecord(data.message) ? data.message : data;
  if (!isRecord(root)) {
    return { actions: [], partialFailure: false };
  }

  const dataNode = isRecord(root.data) ? root.data : root;
  const raw = dataNode.actions;
  const partialFailure = root.partial_failure === true || dataNode.partial_failure === true;

  if (!Array.isArray(raw)) {
    return { actions: [], partialFailure };
  }

  const actions: CandidateActionableApi[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const job_title = typeof item.job_title === "string" ? item.job_title : "";
    const job_id = typeof item.job_id === "string" ? item.job_id : "";
    const name = typeof item.name === "string" ? item.name : "";
    if (!job_title || !job_id) continue;
    const infoRaw = isRecord(item.info) ? item.info : undefined;
    const info = normalizeActionableInfo(infoRaw);
    actions.push({
      job_title,
      job_id,
      rr_candidate: typeof item.rr_candidate === "string" ? item.rr_candidate : "",
      stage: typeof item.stage === "string" ? item.stage : "",
      status: typeof item.status === "string" ? item.status : "",
      name: name || `${job_id}-action`,
      info,
    });
  }

  return { actions, partialFailure };
}

export async function getCandidateActionables(profileId: string): Promise<{
  actions: CandidateActionableApi[];
  partialFailure: boolean;
}> {
  const url = new URL("/api/method/get_candidate_actionables", window.location.origin);
  url.searchParams.set("profile_id", profileId.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  return parseActionablesPayload(data);
}
