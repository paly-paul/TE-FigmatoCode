import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const profile = searchParams.get("profile")?.trim();
  const rr = searchParams.get("rr")?.trim();

  if (!profile || !rr) {
    return NextResponse.json(
      { error: "profile and rr are required." },
      { status: 400 }
    );
  }

  const url = new URL(`${backendBase}/api/method/create_favourite`);
  url.searchParams.set("profile", profile);
  url.searchParams.set("rr", rr);

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(url.toString(), {
    method: "POST",
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
  res.headers.set("x-upstream-url", url.toString());
  return res;
}
