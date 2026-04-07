import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const interviewId =
    typeof body.interview_id === "string" ? body.interview_id.trim() : "";
  const slotId = typeof body.slot_id === "string" ? body.slot_id.trim() : "";

  if (!interviewId || !slotId) {
    return NextResponse.json(
      { error: "interview_id and slot_id are required." },
      { status: 400 }
    );
  }

  const url = `${backendBase}/api/method/post_interview_select_slot`;

  const headers: HeadersInit = { "Content-Type": "application/json" };
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ interview_id: interviewId, slot_id: slotId }),
  });

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
