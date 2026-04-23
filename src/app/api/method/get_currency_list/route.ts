import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const upstreamCandidates = [
    `${backendBase}/api/method/get_currency_list`,
    `${backendBase}/api/method/te_frappe_6fe.api.masters.get_currency_list`,
  ];

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  let upstreamStatus = 500;
  let upstreamData: Record<string, unknown> = {};
  let lastUrl = "";

  for (const candidate of upstreamCandidates) {
    lastUrl = candidate;
    const upstream = await fetch(candidate, { method: "GET", headers });
    const text = await upstream.text();

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { raw: text };
    }

    upstreamStatus = upstream.status;
    upstreamData = parsed;

    if (upstream.ok) break;
  }

  const res = NextResponse.json(upstreamData, { status: upstreamStatus });
  res.headers.set("x-upstream-url", lastUrl);
  return res;
}
