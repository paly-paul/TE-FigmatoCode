import { parseApiErrorMessage } from "@/services/signup/parseApiError";
import { buildE164Phone, normalizeCountryCode } from "@/services/profile/phone";

export interface SaveProfilePayload {
  profile?: string | Record<string, unknown>;
  profile_name?: string;
  profile_id?: string;
  full_name: string;
  email: string;
  professional_title?: string;
  total_experience?: number;
  current_location?: string;
  key_skills?: string[];
  education_details?: Array<{
    degree?: string;
    institution?: string;
    year?: string;
  }>;
  work_experience?: Array<{
    company?: string;
    role?: string;
    from_date?: string;
    to_date?: string;
  }>;
  profile_doc?: Record<string, unknown>;
  profile_version?: Record<string, unknown>;
  action?: "save" | "submit";
  [key: string]: unknown;
}

function normalizeContactFields(record: Record<string, unknown>): Record<string, unknown> {
  const normalizedCountryCode =
    typeof record.country_code === "string"
      ? normalizeCountryCode(record.country_code) ?? record.country_code
      : record.country_code;

  const normalizedContactNo =
    typeof record.contact_no === "string"
      ? buildE164Phone(
          record.contact_no,
          typeof normalizedCountryCode === "string" ? normalizedCountryCode : undefined
        ) ?? record.contact_no
      : record.contact_no;

  return {
    ...record,
    country_code: normalizedCountryCode,
    contact_no: normalizedContactNo,
  };
}

function sanitizeProfileImageField(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const fileUrl = typeof record.file_url === "string" ? record.file_url.trim() : "";
  const altUrl = typeof record.url === "string" ? record.url.trim() : "";
  const resolved = fileUrl || altUrl;
  return resolved ? resolved : undefined;
}

function sanitizePayloadObject(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(input)) {
    if (rawValue === undefined || rawValue === null) continue;
    if (typeof rawValue === "string" && rawValue.trim() === "" && key !== "alternative_email") continue;

    if (key === "profile_image") {
      const sanitizedImage = sanitizeProfileImageField(rawValue);
      if (sanitizedImage !== undefined) {
        output[key] = sanitizedImage;
      }
      continue;
    }

    if (Array.isArray(rawValue)) {
      output[key] = rawValue;
      continue;
    }

    if (typeof rawValue === "object") {
      const nested = sanitizePayloadObject(rawValue as Record<string, unknown>);
      if (Object.keys(nested).length > 0) {
        output[key] = nested;
      }
      continue;
    }

    output[key] = rawValue;
  }

  return output;
}

export async function saveProfile(payload: SaveProfilePayload): Promise<Record<string, unknown>> {
  const normalizedPayload = sanitizePayloadObject({
    ...normalizeContactFields(payload),
    profile:
      payload.profile && typeof payload.profile === "object" && !Array.isArray(payload.profile)
        ? normalizeContactFields(payload.profile as Record<string, unknown>)
        : payload.profile,
    profile_doc:
      payload.profile_doc && typeof payload.profile_doc === "object" && !Array.isArray(payload.profile_doc)
        ? normalizeContactFields(payload.profile_doc)
        : payload.profile_doc,
  });

  const res = await fetch("/api/method/create_edit_profile/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizedPayload),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  if (typeof data.error === "string" && data.error) {
    throw new Error(data.error);
  }

  return data;
}
