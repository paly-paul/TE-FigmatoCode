import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const configuredUrl = process.env.BACKEND_JOB_SEARCH_STATUS_URL?.trim();
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  const fallbackPath = "/api/method/te_frappe_6fe.api.job_search.update_candidate_status";
  const upstreamUrl = configuredUrl || (backendBase ? `${backendBase}${fallbackPath}` : "");

  if (!upstreamUrl) {
    return NextResponse.json(
      {
        error:
          "Job search status endpoint is not configured. Set BACKEND_JOB_SEARCH_STATUS_URL or BACKEND_URL.",
      },
      { status: 503 }
    );
  }

  const headers: HeadersInit = { "Content-Type": "application/json" };
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { raw: text };
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", upstreamUrl);
  return res;
}
