import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

function getCookieValue(cookieHeader: string | null, key: string) {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]).trim() : "";
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

async function fetchJson(url: string, headers: HeadersInit) {
  const response = await fetch(url, { method: "GET", headers });
  const text = await response.text();
  let data: JsonRecord = {};
  try {
    data = JSON.parse(text) as JsonRecord;
  } catch {
    data = { raw: text };
  }
  return { response, data };
}

function pickFirstProfileName(data: JsonRecord) {
  const rows = data.data;
  if (!Array.isArray(rows)) return null;

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const name = (row as JsonRecord).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }

  return null;
}

function pickProfileNameFromLookup(data: JsonRecord) {
  const root =
    data.data && typeof data.data === "object"
      ? (data.data as JsonRecord)
      : data.message && typeof data.message === "object"
        ? (data.message as JsonRecord)
        : data;

  const profile =
    root.profile && typeof root.profile === "object"
      ? (root.profile as JsonRecord)
      : {};

  const name = profile.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const cookieHeader = request.headers.get("cookie");

  const hints = uniqueNonEmpty([
    searchParams.get("candidate_id"),
    searchParams.get("profile_name"),
    getCookieValue(cookieHeader, "user_id"),
    getCookieValue(cookieHeader, "full_name"),
  ]);

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  if (cookieHeader) headers.Cookie = cookieHeader;

  const filterFields = ["name", "email", "user", "candidate_id", "owner", "full_name"];

  for (const hint of hints) {
    for (const field of filterFields) {
      const filters = JSON.stringify([[field, "=", hint]]);
      const url = `${backendBase}/api/resource/Profile?fields=${encodeURIComponent(JSON.stringify(["name"]))}&filters=${encodeURIComponent(filters)}&limit_page_length=1`;
      try {
        const { response, data } = await fetchJson(url, headers);
        if (!response.ok) continue;
        const name = pickFirstProfileName(data);
        if (name) {
          const res = NextResponse.json({ profile_name: name });
          res.headers.set("x-upstream-url", url);
          return res;
        }
      } catch {
        // try next strategy
      }
    }
  }

  try {
    const emailHints = hints.filter((hint) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hint));
    for (const email of emailHints) {
      const lookupUrl = `${backendBase}/api/method/get_profile_by_email?email=${encodeURIComponent(email)}`;
      const { response, data } = await fetchJson(lookupUrl, headers);
      if (!response.ok) continue;
      const name = pickProfileNameFromLookup(data);
      if (name) {
        const res = NextResponse.json({ profile_name: name });
        res.headers.set("x-upstream-url", lookupUrl);
        return res;
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ error: "Profile document ID could not be resolved." }, { status: 404 });
}
