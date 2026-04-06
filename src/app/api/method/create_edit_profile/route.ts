import { NextResponse } from "next/server";
import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type JsonRecord = Record<string, unknown>;

function extractStatus(data: Record<string, unknown>) {
  if (typeof data.status === "string") return data.status;
  const message = data.message;
  if (message && typeof message === "object") {
    const nestedStatus = (message as { status?: unknown }).status;
    if (typeof nestedStatus === "string") return nestedStatus;
  }
  return "";
}

function hasSuccessEnvelope(data: JsonRecord) {
  const message = data.message;
  if (!message || typeof message !== "object") return false;

  const nested = message as JsonRecord;
  const nestedStatus = typeof nested.status === "string" ? nested.status.toLowerCase() : "";
  return (
    nestedStatus === "success" &&
    (
      (typeof nested.profile === "string" && nested.profile.trim()) ||
      (typeof nested.profile_version === "string" && nested.profile_version.trim()) ||
      (typeof nested.action === "string" && nested.action.trim())
    )
  );
}

function normalizeSuccessData(data: JsonRecord): JsonRecord {
  if (!hasSuccessEnvelope(data)) return data;

  const normalized = { ...data };
  delete normalized.error;
  delete normalized.code;
  delete normalized.status;

  const message = normalized.message;
  if (message && typeof message === "object") {
    const nested = message as JsonRecord;
    if (typeof nested.profile === "string" && nested.profile.trim()) {
      normalized.profile_name = nested.profile.trim();
    }
    if (typeof nested.profile_version === "string" && nested.profile_version.trim()) {
      normalized.profile_version_name = nested.profile_version.trim();
    }
  }

  return normalized;
}

function isLogicalFailure(data: JsonRecord) {
  if (hasSuccessEnvelope(data)) return false;
  const statusText = extractStatus(data).toLowerCase();
  return (
    statusText === "failed" ||
    statusText === "error" ||
    data.code === "UNAUTHORIZED" ||
    Boolean(typeof data.exc === "string" && data.exc)
  );
}

async function postJson(url: string, headers: HeadersInit, payload: JsonRecord) {
  const payloadMeta = {
    has_profile: Boolean(payload.profile && typeof payload.profile === "object"),
    has_profile_version: Boolean(payload.profile_version && typeof payload.profile_version === "object"),
    action: typeof payload.action === "string" ? payload.action : undefined,
    mode: payload.mode,
    keys: Object.keys(payload),
  };
  console.info("create_edit_profile proxy -> upstream request", payloadMeta);

  const upstream = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const text = await upstream.text();
  let data: JsonRecord;
  try {
    data = JSON.parse(text) as JsonRecord;
  } catch {
    data = { raw: text };
  }

  console.info("create_edit_profile proxy <- upstream response", {
    status: upstream.status,
    ok: upstream.ok,
    parsed_status: extractStatus(data),
    parsed_error: parseApiErrorMessage(data),
    raw_keys: Object.keys(data),
  });

  return { upstream, data };
}

function toNestedPayload(flat: JsonRecord): JsonRecord {
  const nested: JsonRecord = { ...flat };
  const profile =
    nested.profile && typeof nested.profile === "object" && !Array.isArray(nested.profile)
      ? { ...(nested.profile as JsonRecord) }
      : {};
  const profileVersion =
    nested.profile_version && typeof nested.profile_version === "object" && !Array.isArray(nested.profile_version)
      ? { ...(nested.profile_version as JsonRecord) }
      : {};

  if (typeof flat.full_name === "string" && !profile.full_name) profile.full_name = flat.full_name;
  if (typeof flat.email === "string" && !profile.email) profile.email = flat.email;
  if (typeof flat.current_location === "string" && !profile.current_location) {
    profile.current_location = flat.current_location;
  }

  if (typeof flat.professional_title === "string" && !profileVersion.professional_title) {
    profileVersion.professional_title = flat.professional_title;
  }
  if (flat.total_experience !== undefined && profileVersion.total_experience === undefined) {
    profileVersion.total_experience = flat.total_experience;
  }
  if (Array.isArray(flat.key_skills) && !Array.isArray(profileVersion.key_skills)) {
    profileVersion.key_skills = flat.key_skills;
  }
  if (Array.isArray(flat.work_experience) && !Array.isArray(profileVersion.work_experience)) {
    profileVersion.work_experience = flat.work_experience;
  }
  if (Array.isArray(flat.education_details) && !Array.isArray(profileVersion.education_details)) {
    profileVersion.education_details = flat.education_details;
  }

  nested.profile = profile;
  nested.profile_version = profileVersion;
  return nested;
}

function withNestedProfileVersionMode(payload: JsonRecord, mode: unknown): JsonRecord {
  const nestedPayload = toNestedPayload(payload);
  const profileVersion =
    nestedPayload.profile_version && typeof nestedPayload.profile_version === "object"
      ? { ...(nestedPayload.profile_version as JsonRecord), mode }
      : { mode };

  nestedPayload.profile_version = profileVersion;
  delete nestedPayload.action;
  delete nestedPayload.mode;
  return nestedPayload;
}

function toCanonicalPayload(payload: JsonRecord, profileName: string): JsonRecord {
  const actionValue = typeof payload.action === "string" ? payload.action.trim().toLowerCase() : "";
  const versionName =
    typeof payload.profile_version_name === "string" ? payload.profile_version_name.trim() : "";
  const mode =
    actionValue === "submit"
      ? versionName
        ? "edit"
        : "new"
      : profileName || versionName
        ? "edit"
        : "new";
  return withNestedProfileVersionMode(payload, mode);
}

export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Cannot save profile." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const profileName = typeof body.profile_name === "string" ? body.profile_name.trim() : "";
  const payload = { ...body };
  if (typeof payload.action === "string") {
    payload.action = payload.action.trim().toLowerCase();
  }
  delete payload.profile_name;

  const query = profileName ? `?profile_name=${encodeURIComponent(profileName)}` : "";
  const url = `${backendBase}/api/method/create_edit_profile${query}`;
  console.info("create_edit_profile proxy start", {
    profile_name: profileName || null,
    upstream_url: url,
  });

  const headers: HeadersInit = { "Content-Type": "application/json" };
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const canonicalPayload = toCanonicalPayload(payload, profileName);
  let { upstream, data } = await postJson(url, headers, canonicalPayload);

  if (!upstream.ok || isLogicalFailure(data)) {
    const message = parseApiErrorMessage(data).toLowerCase();
    if (message.includes("missing profile or profile_version")) {
      console.info("create_edit_profile retry", { reason: "missing profile/profile_version", retry: "nested" });
      const nestedPayload = toNestedPayload(payload);
      ({ upstream, data } = await postJson(url, headers, nestedPayload));
    }
  }

  if (!upstream.ok || isLogicalFailure(data)) {
    const message = parseApiErrorMessage(data).toLowerCase();
    if (message.includes("invalid mode")) {
      const modeVariants = profileName
        ? ["edit", "update", "Edit"]
        : ["create", "new", "Create"];

      for (const modeValue of modeVariants) {
        console.info("create_edit_profile retry", {
          reason: "invalid mode",
          retry: "mode variant",
          mode: modeValue,
        });

        const retryPayloads = [
          { label: "nested profile_version.mode", payload: withNestedProfileVersionMode(payload, modeValue) },
        ];

        for (const retryPayload of retryPayloads) {
          ({ upstream, data } = await postJson(url, headers, retryPayload.payload));
          if (upstream.ok && !isLogicalFailure(data)) {
            console.info("create_edit_profile proxy success", {
              via: retryPayload.label,
              mode: modeValue,
            });
            const res = NextResponse.json(normalizeSuccessData(data), { status: upstream.status });
            res.headers.set("x-upstream-url", url);
            return res;
          }
        }
      }
    }

    console.error("create_edit_profile proxy failed", {
      upstream_status: upstream.status,
      error: parseApiErrorMessage(data),
      detail: data,
    });
    const res = NextResponse.json(
      {
        error: parseApiErrorMessage(data),
        detail: data,
      },
      { status: upstream.ok ? 502 : upstream.status }
    );
    res.headers.set("x-upstream-url", url);
    return res;
  }

  console.info("create_edit_profile proxy success", { upstream_status: upstream.status });
  const res = NextResponse.json(normalizeSuccessData(data), { status: upstream.status });
  res.headers.set("x-upstream-url", url);
  return res;
}
