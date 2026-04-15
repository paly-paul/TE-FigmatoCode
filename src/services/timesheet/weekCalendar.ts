import { getJsonOrEmpty, throwHttpIfNeeded, unwrapMessage } from "./common";

export type GetDaysOfWeekResponse = {
  week: number;
  year: number;
  days: string[];
};

function toNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export async function getDaysOfWeek(week: number, year: number): Promise<GetDaysOfWeekResponse> {
  const url = new URL("/api/method/get_days_of_week", window.location.origin);
  url.searchParams.set("week", String(week));
  url.searchParams.set("year", String(year));

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  throwHttpIfNeeded(res, data);
  const root = unwrapMessage(data);

  return {
    week: toNum(root.week) || week,
    year: toNum(root.year) || year,
    days: Array.isArray(root.days)
      ? root.days.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
      : [],
  };
}
