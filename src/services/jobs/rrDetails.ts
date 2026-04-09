import { parseApiErrorMessage } from "@/services/signup/parseApiError";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function firstString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return "";
}

function firstNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value != null) return value;
  }
  return null;
}

async function getJsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export type RrDetailsApi = {
  rr_name: string;
  location: string;
  location_full: string;
  start_date: string;
  end_date: string;
  contract_duration: string;
  rotation_cycle: string;
  hours_per_day: string;
  days_per_week: string;
  match_score: number | null;
  posted_time: string;
};

export async function getRrDetails(rrName: string): Promise<RrDetailsApi> {
  const url = new URL("/api/method/get_rr_details", window.location.origin);
  url.searchParams.set("rr_name", rrName.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  const root = isRecord(data.message) ? data.message : data;
  return {
    rr_name: firstString(root, ["rr_name", "name", "job_id"]),
    location: firstString(root, ["location", "city"]),
    location_full: firstString(root, ["location_full", "country", "location_name"]),
    start_date: firstString(root, ["start_date", "project_est_start_date", "from_date"]),
    end_date: firstString(root, ["end_date", "project_est_end_date", "to_date"]),
    contract_duration: firstString(root, [
      "contract_duration",
      "minimum_contract_duration",
      "duration",
    ]),
    rotation_cycle: firstString(root, ["rotation_cycle", "rotation"]),
    hours_per_day: firstString(root, ["hours_per_day", "working_hours_per_day"]),
    days_per_week: firstString(root, ["days_per_week", "working_days_per_week"]),
    match_score: firstNumber(root, ["match_score", "matching_score", "score"]),
    posted_time: firstString(root, ["posted_time", "posting_time", "created_on"]),
  };
}
