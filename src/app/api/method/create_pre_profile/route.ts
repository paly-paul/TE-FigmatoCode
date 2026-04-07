import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

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

  const contentType = request.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json") || contentType.includes("application/*+json");

  // Build a normalized payload that matches backend contract.
  const payload: Record<string, string> = {};

  // Match Postman/guest access as closely as possible: do not forward local
  // app cookies or backend auth headers for this endpoint.
  const headers: HeadersInit = {};

  const upstreamUrl = `${backendBase}/api/method/create_pre_profile`;

  let email = "";
  if (isJson) {
    const body = (await request.json()) as Record<string, unknown>;
    const pick = (k: string) => {
      const v = body[k];
      return typeof v === "string" ? v.trim() : "";
    };

    email = pick("email");
    const fullName = pick("full_name");
    const firstName = pick("first_name");
    const lastName = pick("last_name");
    const phoneNumber = pick("phone_number");
    const currentLocation = pick("current_location");
    const updatedResume = pick("updated_resume");

    // Required by backend contract
    if (!email || !fullName) {
      return NextResponse.json(
        { error: "email and full_name are required." },
        { status: 400 }
      );
    }

    payload.email = email;
    payload.full_name = fullName;
    if (firstName) payload.first_name = firstName;
    if (lastName) payload.last_name = lastName;
    if (phoneNumber) payload.phone_number = phoneNumber;
    if (currentLocation) payload.current_location = currentLocation;
    if (updatedResume) payload.updated_resume = updatedResume;
  } else {
    const requestClone = request.clone();
    const incoming = await requestClone.formData();

    email = getFormValue(incoming, "email");
    const fullName = getFormValue(incoming, "full_name");
    const firstName = getFormValue(incoming, "first_name");
    const lastName = getFormValue(incoming, "last_name");
    const phoneNumber = getFormValue(incoming, "phone_number");
    const currentLocation = getFormValue(incoming, "current_location");
    const updatedResume = getFormValue(incoming, "updated_resume");
    if (!email || !fullName) {
      return NextResponse.json(
        { error: "email and full_name are required." },
        { status: 400 }
      );
    }

    payload.email = email;
    payload.full_name = fullName;
    if (firstName) payload.first_name = firstName;
    if (lastName) payload.last_name = lastName;
    if (phoneNumber) payload.phone_number = phoneNumber;
    if (currentLocation) payload.current_location = currentLocation;
    if (updatedResume) payload.updated_resume = updatedResume;
  }

  const { upstream, data } = await postCreatePreProfile(
    upstreamUrl,
    { ...headers, "Content-Type": "application/json" },
    JSON.stringify(payload)
  );

  if (upstream.ok && isFailedEnvelope(data)) {
    const res = NextResponse.json(
      {
        error: "create_pre_profile failed upstream.",
        detail: data,
        debug: {
          email: email || null,
          sent_fields: Object.keys(payload),
          upstream_url: upstreamUrl,
          server_messages: extractServerMessages(data),
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
