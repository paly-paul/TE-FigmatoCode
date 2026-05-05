import { NextResponse } from "next/server";
import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type JsonRecord = Record<string, unknown>;

function normalizeCurrentLocationValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  // UI may send "City, Country" but backend expects "City--Country".
  // Keep backend keys as-is.
  if (trimmed.includes("--")) return trimmed;
  return trimmed.replace(/\s*,\s*/g, "--").trim();
}

function normalizeCurrentLocationFields(payload: JsonRecord): JsonRecord {
  const normalized: JsonRecord = { ...payload };

  if (typeof normalized.current_location === "string") {
    normalized.current_location = normalizeCurrentLocationValue(normalized.current_location);
  }

  if (normalized.profile && typeof normalized.profile === "object" && !Array.isArray(normalized.profile)) {
    const profile = { ...(normalized.profile as JsonRecord) };
    if (typeof profile.current_location === "string") {
      profile.current_location = normalizeCurrentLocationValue(profile.current_location);
    }
    if (typeof profile.currentLocation === "string" && profile.current_location === undefined) {
      profile.current_location = normalizeCurrentLocationValue(profile.currentLocation);
      delete profile.currentLocation;
    }
    normalized.profile = profile;
  }

  if (
    normalized.profile_doc &&
    typeof normalized.profile_doc === "object" &&
    !Array.isArray(normalized.profile_doc)
  ) {
    const profileDoc = { ...(normalized.profile_doc as JsonRecord) };
    if (typeof profileDoc.current_location === "string") {
      profileDoc.current_location = normalizeCurrentLocationValue(profileDoc.current_location);
    }
    if (typeof profileDoc.currentLocation === "string" && profileDoc.current_location === undefined) {
      profileDoc.current_location = normalizeCurrentLocationValue(profileDoc.currentLocation);
      delete profileDoc.currentLocation;
    }
    normalized.profile_doc = profileDoc;
  }

  return normalized;
}

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

function extractServerMessages(data: JsonRecord): string[] {
  const raw = data._server_messages;
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (typeof entry !== "string") return "";
        try {
          const inner = JSON.parse(entry) as { message?: unknown };
          return typeof inner.message === "string" ? inner.message.trim() : entry.trim();
        } catch {
          return entry.trim();
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function hasBenignAlreadyLinkedMessage(data: JsonRecord): boolean {
  const serverMessages = extractServerMessages(data);
  if (!serverMessages.length) return false;
  return serverMessages.some((message) => {
    const normalized = message.toLowerCase();
    return normalized.includes("already linked to profile");
  });
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
  // Preserve submit intent for backend state transitions.
  // Dropping action here can cause "Finish" to be treated as save/edit.
  delete nestedPayload.mode;
  return nestedPayload;
}

function normalizePublishedProfileStatus(value: unknown): string {
  if (typeof value !== "string") return "Active";
  const trimmed = value.trim();
  if (!trimmed) return "Active";
  return trimmed.toLowerCase() === "open" ? "Active" : trimmed;
}

function toCanonicalPayload(payload: JsonRecord, profileName: string): JsonRecord {
  const actionValue = typeof payload.action === "string" ? payload.action.trim().toLowerCase() : "";
  const versionName =
    typeof payload.profile_version_name === "string" ? payload.profile_version_name.trim() : "";
  const hasExistingVersion = Boolean(versionName);
  const mode =
    hasExistingVersion
      ? "edit"
      : "new";
  const canonical = withNestedProfileVersionMode(payload, mode);

  if (actionValue === "submit") {
    const profile =
      canonical.profile && typeof canonical.profile === "object" && !Array.isArray(canonical.profile)
        ? { ...(canonical.profile as JsonRecord) }
        : {};
    const profileVersion =
      canonical.profile_version && typeof canonical.profile_version === "object" && !Array.isArray(canonical.profile_version)
        ? { ...(canonical.profile_version as JsonRecord) }
        : {};

    // Align with backend state matrix:
    // submit + (new|edit) => state "Open" (published).
    profile.state = typeof profile.state === "string" && profile.state.trim() ? profile.state : "Open";
    profile.profile_status = normalizePublishedProfileStatus(profile.profile_status);
    profileVersion.state =
      typeof profileVersion.state === "string" && profileVersion.state.trim()
        ? profileVersion.state
        : "Open";
    profileVersion.profile_status = normalizePublishedProfileStatus(profileVersion.profile_status);

    canonical.profile = profile;
    canonical.profile_version = profileVersion;
    if (!("state" in canonical)) canonical.state = "Open";
    canonical.profile_status = normalizePublishedProfileStatus(canonical.profile_status);
  }

  return canonical;
}

function omitProfileVersionField(payload: JsonRecord, fieldName: string): JsonRecord {
  const next: JsonRecord = { ...payload };
  if (next.profile_version && typeof next.profile_version === "object" && !Array.isArray(next.profile_version)) {
    const version = { ...(next.profile_version as JsonRecord) };
    delete version[fieldName];
    next.profile_version = version;
  }
  return next;
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

  const profileName = (() => {
    if (typeof body.profile === "string") return body.profile.trim();
    if (typeof body.profile_id === "string") return body.profile_id.trim();
    if (typeof body.profile_name === "string") return body.profile_name.trim();
    return "";
  })();

  const payload = normalizeCurrentLocationFields({ ...body } as JsonRecord);
  if (typeof payload.action === "string") {
    payload.action = payload.action.trim().toLowerCase();
  }

  // If caller sends profile id as `profile` (string), don't forward it in JSON body.
  if (typeof body.profile === "string") delete payload.profile;
  if (typeof body.profile_id === "string") delete payload.profile_id;
  if (typeof body.profile_name === "string") delete payload.profile_name;

  // Allow callers to avoid clobbering `profile` (object) by sending it as `profile_doc`.
  if (
    payload.profile_doc &&
    typeof payload.profile_doc === "object" &&
    !Array.isArray(payload.profile_doc) &&
    (!payload.profile || typeof payload.profile !== "object" || Array.isArray(payload.profile))
  ) {
    payload.profile = payload.profile_doc as JsonRecord;
  }
  delete payload.profile_doc;

  const query = profileName ? `?profile=${encodeURIComponent(profileName)}` : "";
  const url = `${backendBase}/api/method/create_edit_profile${query}`;
  console.info("create_edit_profile proxy start", {
    profile: profileName || null,
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
    const actionValue = typeof payload.action === "string" ? payload.action.trim().toLowerCase() : "";
    const message = parseApiErrorMessage(data).toLowerCase();
    const shouldRetryWithoutWorkAuthorization =
      actionValue === "submit" &&
      message.includes("internal server error") &&
      payload.profile_version &&
      typeof payload.profile_version === "object" &&
      !Array.isArray(payload.profile_version) &&
      Object.prototype.hasOwnProperty.call(
        payload.profile_version as Record<string, unknown>,
        "work_authorized_countries"
      );

    if (shouldRetryWithoutWorkAuthorization) {
      console.info("create_edit_profile retry", {
        reason: "submit internal error with work authorization",
        retry: "omit work_authorized_countries",
      });
      const payloadWithoutWorkAuthorization = omitProfileVersionField(
        payload,
        "work_authorized_countries"
      );
      const canonicalWithoutWorkAuthorization = toCanonicalPayload(
        payloadWithoutWorkAuthorization,
        profileName
      );
      ({ upstream, data } = await postJson(url, headers, canonicalWithoutWorkAuthorization));
    }
  }

  if (!upstream.ok || isLogicalFailure(data)) {
    if (hasBenignAlreadyLinkedMessage(data)) {
      console.info("create_edit_profile proxy treating benign warning as success", {
        warning: "candidate already linked to profile",
      });
      const fallbackProfileName =
        profileName ||
        (typeof payload.profile === "string" ? payload.profile : "") ||
        (typeof payload.profile_name === "string" ? payload.profile_name : "");
      const successPayload: JsonRecord = normalizeSuccessData({
        ...data,
        status: "success",
        error: "",
        message: {
          status: "success",
          action:
            typeof payload.action === "string" && payload.action.trim()
              ? payload.action.trim()
              : "save",
          profile: fallbackProfileName || undefined,
          message: extractServerMessages(data)[0] || "Profile save completed.",
        },
      });
      const res = NextResponse.json(successPayload, { status: 200 });
      res.headers.set("x-upstream-url", url);
      return res;
    }

    const message = parseApiErrorMessage(data).toLowerCase();
    if (message.includes("no existing profile version to edit")) {
      console.info("create_edit_profile retry", {
        reason: "no existing profile version to edit",
        retry: "force new mode",
      });
      const newModePayload = withNestedProfileVersionMode(payload, "new");
      ({ upstream, data } = await postJson(url, headers, newModePayload));
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
