import { NextResponse } from "next/server";

function firstString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page")?.trim() || "1";
  const limit = searchParams.get("limit")?.trim() || "50";
  const name = searchParams.get("name")?.trim() || "";

  const upstreamUrl = new URL(`${backendBase}/api/method/get_location_details`);
  upstreamUrl.searchParams.set("page", page);
  upstreamUrl.searchParams.set("limit", limit);
  if (name) upstreamUrl.searchParams.set("name", name);

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

  const root =
    data.message && typeof data.message === "object"
      ? (data.message as Record<string, unknown>)
      : data.data && typeof data.data === "object"
        ? (data.data as Record<string, unknown>)
        : data;

  const rowsCandidate = root.data;
  const rows = Array.isArray(rowsCandidate) ? rowsCandidate : [];

  const normalized = rows
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const record = row as Record<string, unknown>;
      const id = firstString(record, ["name", "id"]);
      const city = firstString(record, ["city", "location", "name"]);
      const state = firstString(record, ["state", "county"]);
      const country = firstString(record, ["country"]);
      const label = [city, state, country].filter(Boolean).join(", ") || id;
      return { id: id || label, label };
    })
    .filter((row) => row.id && row.label);

  const res = NextResponse.json(
    {
      data: normalized,
      page: Number.parseInt(page, 10) || 1,
      limit: Number.parseInt(limit, 10) || 50,
    },
    { status: upstream.ok ? 200 : upstream.status }
  );
  res.headers.set("x-upstream-url", upstreamUrl.toString());
  return res;
}
