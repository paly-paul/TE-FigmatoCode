import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const profile = searchParams.get("profile")?.trim();

  const upstreamUrl = new URL(
    `${backendBase}/api/method/te_frappe_6fe.api.timesheet.get_projects_for_profile`
  );
  if (profile) upstreamUrl.searchParams.set("profile", profile);

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
