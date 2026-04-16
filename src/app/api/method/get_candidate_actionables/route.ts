import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

function looksLikeFrappeMethodNotFound(payload: JsonRecord): boolean {
  const exc = typeof payload.exception === "string" ? payload.exception : "";
  const msg = typeof (payload as { message?: unknown }).message === "string"
    ? ((payload as { message: string }).message as string)
    : "";
  const combined = `${exc} ${msg}`.toLowerCase();
  return combined.includes("not found") || combined.includes("does not exist") || combined.includes("not permitted");
}

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id")?.trim();

  if (!profileId) {
    return NextResponse.json(
      { error: "profile_id is required." },
      { status: 400 }
    );
  }

  const qs = new URLSearchParams({ profile_id: profileId });
  const primaryUrl = `${backendBase}/api/method/te_frappe_6fe.api.candidate.get_candidate_actionables?${qs}`;
  const fallbackUrl = `${backendBase}/api/method/get_candidate_actionables?${qs}`;

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const tryFetch = async (url: string) => {
    const upstream = await fetch(url, { method: "GET", headers });
    const text = await upstream.text();
    let data: JsonRecord;
    try {
      data = JSON.parse(text) as JsonRecord;
    } catch {
      data = { raw: text };
    }
    return { upstream, data, url };
  };

  const primary = await tryFetch(primaryUrl);
  const shouldFallback =
    (primary.upstream.status === 404 || primary.upstream.status === 403 || primary.upstream.status === 405) &&
    looksLikeFrappeMethodNotFound(primary.data);

  const result = shouldFallback ? await tryFetch(fallbackUrl) : primary;

  const res = NextResponse.json(result.data, { status: result.upstream.status });
  res.headers.set("x-upstream-url", result.url);
  return res;
}
