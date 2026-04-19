import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const userEmail = searchParams.get("user_email")?.trim();
  const page = searchParams.get("page")?.trim() || "1";
  const limit = searchParams.get("limit")?.trim() || "20";

  if (!userEmail) {
    return NextResponse.json({ error: "user_email is required." }, { status: 400 });
  }

  const qs = new URLSearchParams({
    user_email: userEmail,
    page,
    limit,
  });
  const url = `${backendBase}/api/method/te_frappe_6fe.api.rr_notification.get_user_all_notifications?${qs}`;

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(url, { method: "GET", headers });
  const text = await upstream.text();
  let data: JsonRecord;
  try {
    data = JSON.parse(text) as JsonRecord;
  } catch {
    data = { raw: text };
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", url);
  return res;
}
