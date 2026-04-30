import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

function resolveDownloadUrl(backendBase: string, value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${backendBase}${trimmed}`;
  return `${backendBase}/${trimmed}`;
}

function resolveLocalDownloadUrl(backendBase: string, value: unknown): string | undefined {
  const fullUrl = resolveDownloadUrl(backendBase, value);
  if (!fullUrl) return undefined;

  try {
    const parsed = new URL(fullUrl);
    const key = parsed.searchParams.get("key")?.trim() ?? "";
    const fileName = parsed.searchParams.get("file_name")?.trim() ?? "";
    if (!key) return undefined;

    const localParams = new URLSearchParams();
    localParams.set("key", key);
    if (fileName) localParams.set("file_name", fileName);
    return `/api/method/profile_resume_download?${localParams.toString()}`;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Cannot generate profile resume." },
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

  const upstreamUrl = `${backendBase}/api/method/generate_profile_resume`;
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

  const message = data.message;
  if (message && typeof message === "object") {
    const nested = message as JsonRecord;
    const resolved =
      resolveLocalDownloadUrl(backendBase, nested.profile_download) ??
      resolveLocalDownloadUrl(backendBase, nested.file_url);
    if (resolved) nested.download_url = resolved;
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", upstreamUrl);
  return res;
}
