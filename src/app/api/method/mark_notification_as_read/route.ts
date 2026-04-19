import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set." },
      { status: 503 }
    );
  }

  const url = `${backendBase}/api/method/te_frappe_6fe.api.rr_notification.mark_notification_as_read`;

  let body: JsonRecord = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as JsonRecord;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
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
