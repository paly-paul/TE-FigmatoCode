import { NextResponse } from "next/server";

async function proxyGetData(request: Request, doctype: string, name: string) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Cannot fetch profile data." },
      { status: 503 }
    );
  }

  const upstreamUrl = `${backendBase}/api/method/get_data?doctype=${encodeURIComponent(
    doctype
  )}&name=${encodeURIComponent(name)}`;

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(upstreamUrl, { method: "GET", headers });
  const text = await upstream.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { raw: text };
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", upstreamUrl);
  return res;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const doctype = searchParams.get("doctype")?.trim() ?? "";
  const name = searchParams.get("name")?.trim() ?? "";

  if (!doctype || !name) {
    return NextResponse.json({ error: "doctype and name are required." }, { status: 400 });
  }

  return proxyGetData(request, doctype, name);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const doctype = typeof body.doctype === "string" ? body.doctype.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!doctype || !name) {
    return NextResponse.json({ error: "doctype and name are required." }, { status: 400 });
  }

  return proxyGetData(request, doctype, name);
}

