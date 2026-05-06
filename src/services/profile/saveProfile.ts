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
  mode?: "new" | "edit";
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

function sanitizeCurrentLocationValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  // UI may display locations as "City, Country", but backend expects the key format "City--Country".
  // Also support values that already contain `--`.
  if (trimmed.includes("--")) return trimmed;
  return trimmed.replace(/\s*,\s*/g, "--").trim();
}

function splitListLikeText(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonLike(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function toLanguageCode(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  const map: Record<string, string> = {
    english: "en",
    hindi: "hi",
    tamil: "ta",
    telugu: "te",
    kannada: "kn",
    malayalam: "ml",
    marathi: "mr",
    bengali: "bn",
    gujarati: "gu",
    punjabi: "pa",
    urdu: "ur",
    arabic: "ar",
    french: "fr",
    german: "de",
    spanish: "es",
    portuguese: "pt",
    chinese: "zh",
    japanese: "ja",
  };
  if (map[normalized]) return map[normalized];
  const alpha = normalized.replace(/[^a-z]/g, "");
  return alpha.length >= 2 ? alpha.slice(0, 2) : "";
}

function normalizeObjectList(
  value: unknown,
  targetKey: "country" | "industries" | "key_skills"
): Record<string, string>[] {
  if (typeof value === "string") {
    const parsed = parseJsonLike(value);
    if (parsed !== undefined) {
      return normalizeObjectList(parsed, targetKey);
    }
    const tokens = splitListLikeText(value);
    return tokens.map((token) => ({ [targetKey]: token }));
  }

  if (!Array.isArray(value)) return [];

  const normalized: Record<string, string>[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const parsed = parseJsonLike(item);
      if (parsed !== undefined) {
        normalized.push(...normalizeObjectList(parsed, targetKey));
        continue;
      }
      const token = item.trim();
      if (token) normalized.push({ [targetKey]: token });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const direct = typeof record[targetKey] === "string" ? record[targetKey].trim() : "";
    if (direct) {
      normalized.push({ [targetKey]: direct });
      continue;
    }
    // Fallback for nearby naming variants that may appear in mixed payloads.
    const variant =
      targetKey === "country"
        ? (typeof record.work_authorized_countries === "string" ? record.work_authorized_countries : "")
        : targetKey === "industries"
          ? (typeof record.industry === "string" ? record.industry : "")
          : (typeof record.skill === "string" ? record.skill : "");
    const token = typeof variant === "string" ? variant.trim() : "";
    if (token) normalized.push({ [targetKey]: token });
  }
  return normalized;
}

function normalizeTableRows(key: string, value: unknown): Record<string, unknown>[] {
  const parsedStringValue = typeof value === "string" ? parseJsonLike(value) : undefined;
  const rows =
    parsedStringValue !== undefined
      ? Array.isArray(parsedStringValue)
        ? parsedStringValue
        : [parsedStringValue]
      : typeof value === "string"
        ? splitListLikeText(value)
        : Array.isArray(value)
          ? value
          : [];
  const normalized: Record<string, unknown>[] = [];

  for (const row of rows) {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      const record = sanitizePayloadObject(row as Record<string, unknown>);
      if (Object.keys(record).length > 0) normalized.push(record);
      continue;
    }

    if (typeof row !== "string") continue;
    const parsed = parseJsonLike(row);
    if (parsed !== undefined) {
      const parsedRows = Array.isArray(parsed) ? parsed : [parsed];
      for (const parsedRow of parsedRows) {
        if (parsedRow && typeof parsedRow === "object" && !Array.isArray(parsedRow)) {
          const record = sanitizePayloadObject(parsedRow as Record<string, unknown>);
          if (Object.keys(record).length > 0) normalized.push(record);
        }
      }
      continue;
    }
    const token = row.trim();
    if (!token) continue;

    if (key === "languages") {
      const fname = toLanguageCode(token);
      if (fname) normalized.push({ fname });
      continue;
    }
    if (key === "skills_table") {
      normalized.push({ skill: token, key_skills: token });
      continue;
    }
    if (key === "projects_table") {
      normalized.push({ project_name: token });
      continue;
    }
    if (key === "education_qualifications") {
      normalized.push({ degree: token });
      continue;
    }
    if (key === "certification_table") {
      normalized.push({ certification_name: token });
      continue;
    }
    if (key === "external_profile_links") {
      normalized.push({ platform: "", url: token });
      continue;
    }
  }

  return normalized;
}

function sanitizePayloadObject(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(input)) {
    if (key === "work_experience") continue;
    if (key === "work_authorized_countries") {
      const normalized = normalizeObjectList(rawValue, "country");
      if (normalized.length > 0) output[key] = normalized;
      continue;
    }
    if (key === "preferred_industry" || key === "industries") {
      const normalized = normalizeObjectList(rawValue, "industries");
      if (normalized.length > 0) output.industries = normalized;
      continue;
    }
    if (key === "key_skills") {
      const normalized = normalizeObjectList(rawValue, "key_skills");
      if (normalized.length > 0) output[key] = normalized;
      continue;
    }
    if (
      key === "languages" ||
      key === "skills_table" ||
      key === "projects_table" ||
      key === "education_qualifications" ||
      key === "certification_table" ||
      key === "external_profile_links"
    ) {
      const normalized = normalizeTableRows(key, rawValue);
      if (normalized.length > 0) output[key] = normalized;
      continue;
    }
    if (rawValue === undefined || rawValue === null) continue;
    if (typeof rawValue === "string" && rawValue.trim() === "" && key !== "alternative_email") continue;

    if (key === "profile_image") {
      const sanitizedImage = sanitizeProfileImageField(rawValue);
      if (sanitizedImage !== undefined) {
        output[key] = sanitizedImage;
      }
      continue;
    }

    if (key === "current_location" && typeof rawValue === "string") {
      const sanitizedCurrentLocation = sanitizeCurrentLocationValue(rawValue);
      if (sanitizedCurrentLocation) {
        output[key] = sanitizedCurrentLocation;
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
  const profileObject =
    payload.profile && typeof payload.profile === "object" && !Array.isArray(payload.profile)
      ? normalizeContactFields(payload.profile as Record<string, unknown>)
      : undefined;
  const profileNameFromString =
    typeof payload.profile === "string" ? payload.profile.trim() : "";

  const normalizedPayload = sanitizePayloadObject({
    ...normalizeContactFields(payload),
    ...(payload.mode ? { mode: payload.mode } : {}),
    ...(profileNameFromString ? { profile_name: payload.profile_name || profileNameFromString } : {}),
    ...(profileNameFromString ? { profile_id: payload.profile_id || profileNameFromString } : {}),
    ...(profileObject ? { profile: profileObject } : {}),
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
