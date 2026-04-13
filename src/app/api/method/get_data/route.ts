import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

function isUnauthorized(status: number, data: JsonRecord) {
  if (status === 401 || status === 403) return true;
  const code = typeof data.code === "string" ? data.code.toUpperCase() : "";
  if (code === "UNAUTHORIZED") return true;
  const error = typeof data.error === "string" ? data.error.toLowerCase() : "";
  return error.includes("permission") || error.includes("not permitted");
}

function parseCookieValue(cookieHeader: string | null, key: string) {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]).trim() : "";
}

function asEmail(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : "";
}

async function parseJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as JsonRecord;
  } catch {
    return { raw: text };
  }
}

async function getLoggedInEmail(backendBase: string, headers: HeadersInit, cookieHeader: string | null) {
  const fromCookie = asEmail(parseCookieValue(cookieHeader, "user_id"));
  if (fromCookie) return fromCookie;

  try {
    const loggedUserUrl = `${backendBase}/api/method/frappe.auth.get_logged_user`;
    const response = await fetch(loggedUserUrl, { method: "GET", headers });
    if (!response.ok) return "";
    const data = await parseJson(response);
    const message =
      typeof data.message === "string"
        ? data.message.trim()
        : typeof data.data === "string"
          ? data.data.trim()
          : "";
    return asEmail(message);
  } catch {
    return "";
  }
}

async function tryProfileByEmailFallback(
  backendBase: string,
  headers: HeadersInit,
  requestedName: string,
  cookieHeader: string | null
) {
  const email = await getLoggedInEmail(backendBase, headers, cookieHeader);
  if (!email) return null;

  const lookupUrl = `${backendBase}/api/method/get_profile_by_email?email=${encodeURIComponent(email)}`;
  const response = await fetch(lookupUrl, { method: "GET", headers });
  const data = await parseJson(response);
  if (!response.ok) return null;

  const root =
    data.data && typeof data.data === "object"
      ? (data.data as JsonRecord)
      : data.message && typeof data.message === "object"
        ? (data.message as JsonRecord)
        : data;
  const profile =
    root.profile && typeof root.profile === "object" ? (root.profile as JsonRecord) : ({} as JsonRecord);
  const resolvedProfileName = typeof profile.name === "string" ? profile.name.trim() : "";
  if (requestedName && resolvedProfileName && requestedName !== resolvedProfileName) return null;

  const res = NextResponse.json(data, { status: response.status });
  res.headers.set("x-upstream-url", lookupUrl);
  res.headers.set("x-fallback-used", "get_profile_by_email");
  return res;
}

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
  const data = await parseJson(upstream);

  if (doctype.toLowerCase() === "profile" && isUnauthorized(upstream.status, data)) {
    const fallback = await tryProfileByEmailFallback(backendBase, headers, name, cookie);
    if (fallback) return fallback;
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

