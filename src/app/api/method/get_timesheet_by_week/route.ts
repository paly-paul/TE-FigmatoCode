import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const rrCandidateId = searchParams.get("rr_candidate_id")?.trim();
  const week = searchParams.get("week")?.trim();
  const year = searchParams.get("year")?.trim();

  const upstreamUrl = new URL(
    `${backendBase}/api/method/te_frappe_6fe.api.timesheet.get_timesheet_by_week`
  );
  if (rrCandidateId) upstreamUrl.searchParams.set("rr_candidate_id", rrCandidateId);
  if (week) upstreamUrl.searchParams.set("week", week);
  if (year) upstreamUrl.searchParams.set("year", year);

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(upstreamUrl.toString(), { method: "GET", headers });
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
