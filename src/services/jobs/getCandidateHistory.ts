function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

async function getJsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function unwrapPayload(data: Record<string, unknown>): Record<string, unknown> {
  const direct = isRecord(data.data) ? data.data : null;
  if (direct && isRecord(direct.data)) return direct.data;
  if (direct) return direct;

  const message = isRecord(data.message) ? data.message : null;
  if (message && isRecord(message.data)) return message.data;
  if (message) return message;

  return data;
}

export type CandidateHistoryEntry = {
  candidate_stage: string;
  candidate_status: string;
  updated_on: string;
  remarks: string;
  is_rejected: number;
  base_salary: string | null;
  proposed_joining_date: string | null;
  ref_doctype: string;
  ref_doc: string;
};

export type CandidateHistoryApi = {
  rr_candidate: string;
  entries: CandidateHistoryEntry[];
};

function parseEntry(raw: unknown): CandidateHistoryEntry | null {
  if (!isRecord(raw)) return null;
  const candidate_stage = asString(raw.candidate_stage) || asString(raw.stage);
  const candidate_status = asString(raw.candidate_status) || asString(raw.status);
  const updated_on =
    asString(raw.updated_on) ||
    asString(raw.date) ||
    asString(raw.timestamp) ||
    asString(raw.created_on);

  if (!candidate_stage && !updated_on) return null;
  return {
    candidate_stage,
    candidate_status,
    updated_on,
    remarks: asString(raw.remarks) || asString(raw.description) || "",
    is_rejected: typeof raw.is_rejected === "number" ? raw.is_rejected : 0,
    base_salary: typeof raw.base_salary === "string" ? raw.base_salary : null,
    proposed_joining_date:
      typeof raw.proposed_joining_date === "string" ? raw.proposed_joining_date : null,
    ref_doctype: asString(raw.ref_doctype) || "",
    ref_doc: asString(raw.ref_doc) || "",
  };
}

export async function getCandidateHistory(rrCandidate: string): Promise<CandidateHistoryApi> {
  const url = new URL("/api/method/get_rr_candidate_history", window.location.origin);
  url.searchParams.set("rr_candidate", rrCandidate.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);

  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }

  const root = unwrapPayload(data);

  const rawEntries = Array.isArray(root.history)
    ? root.history
    : Array.isArray(root.entries)
      ? root.entries
      : Array.isArray(root.data)
        ? root.data
        : Array.isArray(data.message)
          ? data.message
          : [];

  const entries: CandidateHistoryEntry[] = rawEntries
    .map(parseEntry)
    .filter((e): e is CandidateHistoryEntry => e !== null);

  return {
    rr_candidate: asString(root.rr_candidate) || rrCandidate,
    entries,
  };
}
