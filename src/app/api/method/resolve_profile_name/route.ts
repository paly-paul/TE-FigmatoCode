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
    searchParams.get("email"),
    searchParams.get("profile_name"),
    getCookieValue(cookieHeader, "user_id"),
    getCookieValue(cookieHeader, "full_name"),
  ]);
  console.info("[resolve_profile_name] start", {
    hints,
    hasCookieHeader: Boolean(cookieHeader),
  });

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  if (cookieHeader) headers.Cookie = cookieHeader;

  const filterFields = ["name", "email", "user", "candidate_id", "owner", "full_name"];
  let lastUpstreamError:
    | { status: number; ok: boolean; url: string; data: JsonRecord; hint: string; field?: string }
    | undefined;

  for (const hint of hints) {
    for (const field of filterFields) {
      const filters = JSON.stringify([[field, "=", hint]]);
      const url = `${backendBase}/api/resource/Profile?fields=${encodeURIComponent(JSON.stringify(["name"]))}&filters=${encodeURIComponent(filters)}&limit_page_length=1`;
      try {
        const { response, data } = await fetchJson(url, headers);
        console.info("[resolve_profile_name] resource lookup", {
          hint,
          field,
          status: response.status,
          ok: response.ok,
          data,
        });
        if (!response.ok) {
          lastUpstreamError = { status: response.status, ok: response.ok, url, data, hint, field };
          continue;
        }
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
      console.info("[resolve_profile_name] email lookup", {
        email,
        status: response.status,
        ok: response.ok,
        data,
      });
      if (!response.ok) {
        lastUpstreamError = { status: response.status, ok: response.ok, url: lookupUrl, data, hint: email };
        continue;
      }
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

  if (lastUpstreamError && (lastUpstreamError.status === 401 || lastUpstreamError.status === 403)) {
    const res = NextResponse.json(
      {
        error:
          lastUpstreamError.status === 401
            ? "Backend unauthorized while resolving profile name. Login session may be missing/expired."
            : "Backend permission denied while resolving profile name. This user may not have read access to Profile.",
        detail: lastUpstreamError.data,
      },
      { status: lastUpstreamError.status }
    );
    res.headers.set("x-upstream-url", lastUpstreamError.url);
    return res;
  }

  console.warn("[resolve_profile_name] not-found", { hints });
  return NextResponse.json({ error: "Profile document ID could not be resolved." }, { status: 404 });
}
