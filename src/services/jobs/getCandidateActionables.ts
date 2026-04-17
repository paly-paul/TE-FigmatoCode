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
  backendStatus?: string;
  backendErrorMessage?: string;
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
  const backendStatus = typeof root.status === "string" ? root.status : undefined;
  const backendErrorMessage = typeof root.message === "string" ? root.message : undefined;

  if (!Array.isArray(raw)) {
    return { actions: [], partialFailure, backendStatus, backendErrorMessage };
  }

  const actions: CandidateActionableApi[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const job_title =
      firstString(item, ["job_title", "job_name", "title", "position", "rr_title"]) || "";
    const job_id =
      firstString(item, ["job_id", "rr", "job_opening", "job", "opening_id", "rr_id"]) || "";
    // Different backends/environments may send the actionable doc id under different keys.
    // This id is critical for proposal actions (proposal_name) and for interview slot submission.
    const name =
      firstString(item, [
        "name",
        "proposal_name",
        "proposal",
        "proposal_id",
        "interview_id",
        "interview",
        "interview_name",
        "id",
      ]) || "";
    // Some proposal actionables may omit job fields; keep them so the UI can still render a card.
    // Use stable fallbacks so they can be grouped/deduped, but avoid breaking true job-based flows.
    const rr_candidate = typeof item.rr_candidate === "string" ? item.rr_candidate : "";
    const derivedJobId = job_id || rr_candidate || name;
    const derivedJobTitle = job_title || (rr_candidate ? "Proposal update" : "");
    if (!derivedJobId || !derivedJobTitle) continue;
    const infoRaw = isRecord(item.info) ? item.info : undefined;
    const info = normalizeActionableInfo(infoRaw);
    const stage = firstString(item, ["stage", "rr_candidate_stage", "candidate_stage"]) || "";
    const status = firstString(item, ["status", "rr_candidate_status", "candidate_status"]) || "";
    const accepted_at = firstString(item, ["accepted_at"]);
    const received_at = firstString(item, [
      "received_at",
      "accepted_at",
      "created_at",
      "creation",
      "date",
      "timestamp",
    ]);
    actions.push({
      job_title: derivedJobTitle,
      job_id: derivedJobId,
      rr_candidate,
      // Some backends/environments may emit stage/status under rr_candidate_* keys.
      // Also helps when stage/status are accidentally swapped upstream.
      stage,
      status,
      accepted_at,
      received_at,
      // Avoid fabricating ids when the backend didn't provide one; proposal endpoints require a real name.
      // Keep a stable fallback only for UI list keys.
      name: name || `${derivedJobId}-action`,
      info,
    });
  }

  return { actions, partialFailure, backendStatus, backendErrorMessage };
}

export async function getCandidateActionables(profileId: string): Promise<{
  actions: CandidateActionableApi[];
  partialFailure: boolean;
  backendStatus?: string;
  backendErrorMessage?: string;
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
