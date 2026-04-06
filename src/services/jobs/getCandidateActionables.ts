import { parseApiErrorMessage } from "@/services/signup/parseApiError";
import type { CandidateActionableApi } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseActionablesPayload(data: Record<string, unknown>): {
  actions: CandidateActionableApi[];
  partialFailure: boolean;
} {
  const inner = data.data;
  if (!isRecord(inner)) {
    return { actions: [], partialFailure: false };
  }

  const raw = inner.actions;
  const partialFailure = data.partial_failure === true;

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
    actions.push({
      job_title,
      job_id,
      rr_candidate: typeof item.rr_candidate === "string" ? item.rr_candidate : "",
      stage: typeof item.stage === "string" ? item.stage : "",
      status: typeof item.status === "string" ? item.status : "",
      name: name || `${job_id}-action`,
      info: isRecord(item.info) ? (item.info as CandidateActionableApi["info"]) : undefined,
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
