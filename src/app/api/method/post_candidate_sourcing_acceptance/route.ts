import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const data = body.data;
  const dataRecord =
    typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
  const rrCandidateName =
    dataRecord && typeof dataRecord.rrcandidate_name === "string"
      ? dataRecord.rrcandidate_name.trim()
      : "";

  if (!rrCandidateName) {
    return NextResponse.json(
      { error: "data.rrcandidate_name is required." },
      { status: 400 }
    );
  }

  const url = `${backendBase}/api/method/post_candidate_sourcing_acceptance`;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await upstream.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    payload = { raw: text };
  }

  const res = NextResponse.json(payload, { status: upstream.status });
  res.headers.set("x-upstream-url", url);
  return res;
}
