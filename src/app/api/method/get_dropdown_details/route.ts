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

  const upstreamUrl = new URL(`${backendBase}/api/method/te_frappe_6fe.api.masters.get_dropdown_details`);
  upstreamUrl.searchParams.set("doctype", doctype);
  upstreamUrl.searchParams.set("field_name", fieldName);
  upstreamUrl.searchParams.set("page", page);
  upstreamUrl.searchParams.set("limit", limit);

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(upstreamUrl.toString(), { method: "GET", headers });
  const text = await upstream.text();

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { raw: text };
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", upstreamUrl.toString());
  return res;
}
