import {
  getJsonOrEmpty,
  isRecord,
  throwHttpIfNeeded,
  unwrapMessage,
} from "./common";

export type WeekTimesheetDay = {
  week_date: string;
  total_working_hours: number;
  remarks: string;
  is_weekoff: string;
};

export type GetTimesheetByWeekResponse = {
  rr_candidate: string;
  status: string;
  week_number: number;
  week_data: WeekTimesheetDay[];
  message?: string;
};

function toNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeWeekData(raw: unknown): WeekTimesheetDay[] {
  if (!Array.isArray(raw)) return [];
  const out: WeekTimesheetDay[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    out.push({
      week_date: typeof item.week_date === "string" ? item.week_date : "",
      total_working_hours: toNum(item.total_working_hours),
      remarks: typeof item.remarks === "string" ? item.remarks : "",
      is_weekoff: typeof item.is_weekoff === "string" ? item.is_weekoff : "",
    });
  }
  return out;
}

export async function getTimesheetByWeek(input: {
  rr_candidate_id: string;
  week: number;
  year: number;
}): Promise<GetTimesheetByWeekResponse> {
  const url = new URL("/api/method/get_timesheet_by_week", window.location.origin);
  url.searchParams.set("rr_candidate_id", input.rr_candidate_id.trim());
  url.searchParams.set("week", String(input.week));
  url.searchParams.set("year", String(input.year));

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  throwHttpIfNeeded(res, data);

  const root = unwrapMessage(data);
  return {
    rr_candidate:
      typeof root.rr_candidate === "string" ? root.rr_candidate : input.rr_candidate_id.trim(),
    status: typeof root.status === "string" ? root.status : "",
    week_number: toNum(root.week_number) || input.week,
    week_data: normalizeWeekData(root.week_data),
    message: typeof root.message === "string" ? root.message : undefined,
  };
}
