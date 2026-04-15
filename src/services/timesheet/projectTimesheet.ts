import { getJsonOrEmpty, isRecord, throwHttpIfNeeded, unwrapMessage } from "./common";

export type ProjectTimesheetEntry = {
  name: string;
  date: string;
  total_work_hours: number;
  day_type: string;
};

export type GetTimesheetForProjectResponse = {
  project: string;
  week: number;
  year: number;
  entries: ProjectTimesheetEntry[];
};

function toNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeEntries(raw: unknown): ProjectTimesheetEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ProjectTimesheetEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    out.push({
      name: typeof item.name === "string" ? item.name : "",
      date: typeof item.date === "string" ? item.date : "",
      total_work_hours: toNum(item.total_work_hours),
      day_type: typeof item.day_type === "string" ? item.day_type : "",
    });
  }
  return out;
}

export async function getTimesheetForProject(input: {
  project: string;
  week: number;
  year: number;
}): Promise<GetTimesheetForProjectResponse> {
  const url = new URL("/api/method/get_timesheet_for_project", window.location.origin);
  url.searchParams.set("project", input.project.trim());
  url.searchParams.set("week", String(input.week));
  url.searchParams.set("year", String(input.year));

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  throwHttpIfNeeded(res, data);

  const root = unwrapMessage(data);
  return {
    project: typeof root.project === "string" ? root.project : input.project.trim(),
    week: toNum(root.week) || input.week,
    year: toNum(root.year) || input.year,
    entries: normalizeEntries(root.entries),
  };
}
