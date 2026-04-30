import { parseApiErrorMessage } from "@/services/signup/parseApiError";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
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

function unwrapPayload(data: Record<string, unknown>): Record<string, unknown> {
  const direct = isRecord(data.data) ? data.data : null;
  if (direct && isRecord(direct.data)) return direct.data;
  if (direct) return direct;

  const message = isRecord(data.message) ? data.message : null;
  if (message && isRecord(message.data)) return message.data;
  if (message) return message;

  return data;
}

function resolveRotationCycle(row: Record<string, unknown>): string {
  const explicit = firstString(row, ["rotation_cycle", "rotation"]);
  if (explicit) return explicit;

  const isRotation = asString(row.is_rotation);
  if (isRotation === "0") return "No Rotation";

  const onWeeks = asString(row.rotation_on_weeks);
  const onDays = asString(row.rotation_on_days);
  const offWeeks = asString(row.rotation_off_weeks);
  const offDays = asString(row.rotation_off_days);
  if (onWeeks || onDays || offWeeks || offDays) {
    const on = `${onWeeks || "0"}W ${onDays || "0"}D`;
    const off = `${offWeeks || "0"}W ${offDays || "0"}D`;
    return `On: ${on} / Off: ${off}`;
  }

  return "";
}

export type RrDetailsApi = {
  rr_name: string;
  location: string;
  location_full: string;
  position_start_date: string;
  position_est_end_date: string;
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

  const root = unwrapPayload(data);
  return {
    rr_name: firstString(root, ["rr_name", "name", "job_id"]),
    location: firstString(root, ["location", "city"]),
    location_full: firstString(root, ["location_full", "country", "location_name"]),
    position_start_date: firstString(root, ["position_start_date", "start_date", "project_est_start_date", "from_date"]),
    position_est_end_date: firstString(root, [
      "position_est_end_date",
      "end_date",
      "project_est_end_date",
      "to_date",
    ]),
    start_date: firstString(root, ["start_date", "project_est_start_date", "from_date"]),
    end_date: firstString(root, ["end_date", "project_est_end_date", "to_date"]),
    contract_duration: firstString(root, [
      "contract_duration",
      "minimum_contract_duration",
      "duration",
    ]),
    rotation_cycle: resolveRotationCycle(root),
    hours_per_day: firstString(root, ["hours_per_day", "working_hours_per_day", "work_hours_per_day"]),
    days_per_week: firstString(root, ["days_per_week", "working_days_per_week", "work_days_per_week"]),
    match_score: firstNumber(root, ["match_score", "matching_score", "score"]),
    posted_time: firstString(root, ["posted_time", "posting_time", "created_on"]),
  };
}
