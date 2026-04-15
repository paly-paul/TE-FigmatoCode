import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week")?.trim();
  const year = searchParams.get("year")?.trim();

  const parsedWeek = Number.parseInt(week ?? "", 10);
  const parsedYear = year ? Number.parseInt(year, 10) : new Date().getFullYear();

  if (!Number.isInteger(parsedWeek) || parsedWeek < 1 || parsedWeek > 53) {
    return NextResponse.json({ error: "week must be an integer between 1 and 53." }, { status: 400 });
  }
  if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 9999) {
    return NextResponse.json({ error: "year must be a valid 4-digit year." }, { status: 400 });
  }

  const upstreamUrl = new URL(
    `${backendBase}/api/method/te_frappe_6fe.api.timesheet.get_days_of_week`
  );
  upstreamUrl.searchParams.set("week", String(parsedWeek));
  upstreamUrl.searchParams.set("year", String(parsedYear));

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(upstreamUrl.toString(), {
    method: "GET",
    headers,
  });

  const text = await upstream.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { raw: text };
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", upstreamUrl.toString());
  return res;
}
