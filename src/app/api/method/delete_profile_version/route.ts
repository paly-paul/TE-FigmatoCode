import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const profileVersionName = searchParams.get("profile_version_name")?.trim();
  if (!profileVersionName) {
    return NextResponse.json({ error: "profile_version_name is required." }, { status: 400 });
  }

  const url = `${backendBase}/api/method/delete_profile_version?profile_version_name=${encodeURIComponent(profileVersionName)}`;

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(url, { method: "GET", headers });
  const text = await upstream.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { raw: text };
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", url);
  return res;
}
