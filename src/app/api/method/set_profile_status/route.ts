import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Cannot update profile status." },
      { status: 503 }
    );
  }

  let body: JsonRecord;
  try {
    body = (await request.json()) as JsonRecord;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const headers: HeadersInit = { "Content-Type": "application/json" };
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstreamUrl = `${backendBase}/api/method/set_profile_status`;
  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  let data: JsonRecord;
  try {
    data = JSON.parse(text) as JsonRecord;
  } catch {
    data = { raw: text };
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", upstreamUrl);
  return res;
}
