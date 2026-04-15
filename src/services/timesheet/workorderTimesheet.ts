import { getJsonOrEmpty, isRecord, throwHttpIfNeeded, unwrapMessage } from "./common";

export type WorkorderTimesheet = {
  consolidation_name: string;
  week_number: number;
  year: number;
  loop: number;
  week_start_date: string;
  week_end_date: string;
  consolidation_status: string;
  total_work_hours: number;
};

export type GetTimesheetForWorkorderResponse = {
  status: string;
  rr_candidate_id: string;
  year: string;
  timesheets: WorkorderTimesheet[];
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

function normalizeTimesheets(raw: unknown): WorkorderTimesheet[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkorderTimesheet[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    out.push({
      consolidation_name:
        typeof item.consolidation_name === "string" ? item.consolidation_name : "",
      week_number: toNum(item.week_number),
      year: toNum(item.year),
      loop: toNum(item.loop),
      week_start_date: typeof item.week_start_date === "string" ? item.week_start_date : "",
      week_end_date: typeof item.week_end_date === "string" ? item.week_end_date : "",
      consolidation_status:
        typeof item.consolidation_status === "string" ? item.consolidation_status : "",
      total_work_hours: toNum(item.total_work_hours),
    });
  }
  return out;
}

export async function getTimesheetForWorkorder(
  rrCandidateId: string,
  year?: number
): Promise<GetTimesheetForWorkorderResponse> {
  const url = new URL("/api/method/get_timesheet_for_workorder", window.location.origin);
  url.searchParams.set("rr_candidate_id", rrCandidateId.trim());
  if (typeof year === "number" && Number.isFinite(year)) {
    url.searchParams.set("year", String(year));
  }

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  throwHttpIfNeeded(res, data);

  const root = unwrapMessage(data);
  const status = typeof root.status === "string" ? root.status : "success";
  const rrId =
    typeof root.rr_candidate_id === "string" ? root.rr_candidate_id : rrCandidateId.trim();
  const resolvedYear =
    typeof root.year === "string"
      ? root.year
      : typeof root.year === "number"
        ? String(root.year)
        : year
          ? String(year)
          : "";

  return {
    status,
    rr_candidate_id: rrId,
    year: resolvedYear,
    timesheets: normalizeTimesheets(root.timesheets),
    message: typeof root.message === "string" ? root.message : undefined,
  };
}
