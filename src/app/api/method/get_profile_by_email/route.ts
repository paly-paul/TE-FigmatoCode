import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

async function parseJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as JsonRecord;
  } catch {
    return { raw: text };
  }
}

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstreamUrl = `${backendBase}/api/method/te_frappe_6fe.api.profile.get_profile_by_email?email=${encodeURIComponent(
    email
  )}`;

  const upstream = await fetch(upstreamUrl, { method: "GET", headers });
  const data = await parseJson(upstream);

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", upstreamUrl);
  return res;
}

