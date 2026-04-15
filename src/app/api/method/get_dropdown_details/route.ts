import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const doctype = searchParams.get("doctype")?.trim();
  const fieldName = searchParams.get("field_name")?.trim();
  const page = searchParams.get("page")?.trim() || "1";
  const limit = searchParams.get("limit")?.trim() || "50";

  if (!doctype || !fieldName) {
    return NextResponse.json(
      { error: "doctype and field_name are required." },
      { status: 400 }
    );
  }

  const upstreamCandidates = [
    `${backendBase}/api/method/get_dropdown_details`,
    `${backendBase}/api/method/te_frappe_6fe.api.masters.get_dropdown_details`,
  ];

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  let upstreamStatus = 500;
  let upstreamData: Record<string, unknown> = {};
  let lastUrl = "";

  for (const candidate of upstreamCandidates) {
    const upstreamUrl = new URL(candidate);
    upstreamUrl.searchParams.set("doctype", doctype);
    upstreamUrl.searchParams.set("field_name", fieldName);
    upstreamUrl.searchParams.set("page", page);
    upstreamUrl.searchParams.set("limit", limit);
    lastUrl = upstreamUrl.toString();

    const upstream = await fetch(lastUrl, { method: "GET", headers });
    const text = await upstream.text();

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { raw: text };
    }

    upstreamStatus = upstream.status;
    upstreamData = parsed;

    if (upstream.ok) break;
  }

  const res = NextResponse.json(upstreamData, { status: upstreamStatus });
  res.headers.set("x-upstream-url", lastUrl);
  return res;
}
