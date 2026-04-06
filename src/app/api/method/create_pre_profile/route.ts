import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const CREATE_PRE_PROFILE_ALLOWED_FIELDS = new Set([
  "email",
  "full_name",
  "phone_number",
  "current_location",
  "updated_resume",
]);

function isFailedEnvelope(data: JsonRecord) {
  if (typeof data.status === "string" && data.status.toLowerCase() === "failed") return true;
  if (typeof data.message === "string") {
    try {
      const parsed = JSON.parse(data.message) as JsonRecord;
      if (typeof parsed.status === "string" && parsed.status.toLowerCase() === "failed") return true;
    } catch {
      // ignore
    }
  }
  if (data.message && typeof data.message === "object") {
    const nested = data.message as JsonRecord;
    if (typeof nested.status === "string" && nested.status.toLowerCase() === "failed") return true;
  }
  return false;
}

function extractServerMessages(data: JsonRecord): string[] {
  const raw = data._server_messages;
  if (typeof raw !== "string" || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (typeof entry !== "string") return null;
        try {
          const decoded = JSON.parse(entry) as JsonRecord;
          const message = decoded.message;
          return typeof message === "string" ? message : entry;
        } catch {
          return entry;
        }
      })
      .filter((message): message is string => Boolean(message));
  } catch {
    return [raw];
  }
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  let data: JsonRecord = {};
  try {
    data = JSON.parse(text) as JsonRecord;
  } catch {
    data = { raw: text };
  }
  return data;
}

async function postCreatePreProfile(upstreamUrl: string, headers: HeadersInit, body: BodyInit) {
  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers,
    body,
  });
  const data = await parseJsonResponse(upstream);
  return { upstream, data };
}

async function tryResolveBackendProfileName(backendBase: string, headers: HeadersInit, email: string) {
  const lookupUrl = `${backendBase}/api/method/get_profile_by_email?email=${encodeURIComponent(email)}`;
  try {
    const response = await fetch(lookupUrl, { method: "GET", headers });
    const data = await parseJsonResponse(response);
    if (!response.ok) return undefined;
    const root =
      data.data && typeof data.data === "object"
        ? (data.data as JsonRecord)
        : data.message && typeof data.message === "object"
          ? (data.message as JsonRecord)
          : data;
    const profile =
      root.profile && typeof root.profile === "object" ? (root.profile as JsonRecord) : {};
    const name = profile.name;
    return typeof name === "string" && name.trim() ? name.trim() : undefined;
  } catch {
    return undefined;
  }
}

async function tryResolveBackendCandidateName(backendBase: string, headers: HeadersInit, email: string) {
  const candidateFields = ["email", "email_id", "emailId", "user_id", "user", "owner"];

  for (const field of candidateFields) {
    const filters = JSON.stringify([[field, "=", email]]);
    const url = `${backendBase}/api/resource/Candidate?fields=${encodeURIComponent(
      JSON.stringify(["name"])
    )}&filters=${encodeURIComponent(filters)}&limit_page_length=1`;
    try {
      const response = await fetch(url, { method: "GET", headers });
      const data = await parseJsonResponse(response);
      if (!response.ok) continue;
      const rows = data.data;
      if (!Array.isArray(rows) || !rows[0] || typeof rows[0] !== "object") continue;
      const name = (rows[0] as JsonRecord).name;
      if (typeof name === "string" && name.trim()) return name.trim();
    } catch {
      // try next field
    }
  }

  return undefined;
}

export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Cannot create pre-profile." },
      { status: 503 }
    );
  }

  const requestClone = request.clone();
  const incoming = await requestClone.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  // Match Postman/guest access as closely as possible: do not forward local
  // app cookies or backend auth headers for this endpoint.
  const contentType = request.headers.get("content-type")?.trim() || "";
  const headers: HeadersInit = contentType ? { "Content-Type": contentType } : {};

  const email = getFormValue(incoming, "email");
  const upstreamUrl = `${backendBase}/api/method/create_pre_profile`;
  const rawBody = await request.arrayBuffer();
  const fallbackWithoutFile = new FormData();
  fallbackWithoutFile.append("email", getFormValue(incoming, "email"));
  fallbackWithoutFile.append("full_name", getFormValue(incoming, "full_name"));
  incoming.forEach((value, key) => {
    if (!CREATE_PRE_PROFILE_ALLOWED_FIELDS.has(key)) return;
    if (typeof value !== "string") return;
    if (key !== "email" && key !== "full_name") fallbackWithoutFile.append(key, value);
  });
  const fallbackMinimal = new FormData();
  fallbackMinimal.append("email", getFormValue(incoming, "email"));
  fallbackMinimal.append("full_name", getFormValue(incoming, "full_name"));

  const attempts: Array<{
    label: string;
    sent_fields: string[];
    status: number;
    ok: boolean;
    data: JsonRecord;
    server_messages: string[];
  }> = [];

  let { upstream, data } = await postCreatePreProfile(upstreamUrl, headers, rawBody);
  attempts.push({
    label: "raw_browser_multipart",
    sent_fields: Array.from(incoming.keys()),
    status: upstream.status,
    ok: upstream.ok,
    data,
    server_messages: extractServerMessages(data),
  });

  if ((!upstream.ok || isFailedEnvelope(data)) && Array.from(fallbackWithoutFile.keys()).length > 0) {
    const retry = await postCreatePreProfile(upstreamUrl, headers, fallbackWithoutFile);
    upstream = retry.upstream;
    data = retry.data;
    attempts.push({
      label: "without_file",
      sent_fields: Array.from(fallbackWithoutFile.keys()),
      status: upstream.status,
      ok: upstream.ok,
      data,
      server_messages: extractServerMessages(data),
    });
  }

  if ((!upstream.ok || isFailedEnvelope(data)) && Array.from(fallbackMinimal.keys()).length > 0) {
    const retry = await postCreatePreProfile(upstreamUrl, headers, fallbackMinimal);
    upstream = retry.upstream;
    data = retry.data;
    attempts.push({
      label: "minimal_identity_only",
      sent_fields: Array.from(fallbackMinimal.keys()),
      status: upstream.status,
      ok: upstream.ok,
      data,
      server_messages: extractServerMessages(data),
    });
  }

  if (upstream.ok && isFailedEnvelope(data)) {
    const res = NextResponse.json(
      {
        error: "create_pre_profile failed upstream.",
        detail: data,
        debug: {
          email: email || null,
          sent_fields: Array.from(incoming.keys()),
          upstream_url: upstreamUrl,
          server_messages: extractServerMessages(data),
          attempts,
        },
      },
      { status: 502 }
    );
    res.headers.set("x-upstream-url", upstreamUrl);
    return res;
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", upstreamUrl);
  return res;
}
