import type { ResumeProfileData } from "@/types/profile";
import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type UnknownRecord = Record<string, unknown>;

export interface GeneratedResumeProfileData extends ResumeProfileData {
  profileName?: string;
  profileVersionName?: string;
  preProfileName?: string;
}

function pickString(obj: UnknownRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function isFailedEnvelope(data: UnknownRecord) {
  if (typeof data.status === "string" && data.status.toLowerCase() === "failed") return true;
  if (data.message && typeof data.message === "object") {
    const nested = data.message as UnknownRecord;
    if (typeof nested.status === "string" && nested.status.toLowerCase() === "failed") return true;
  }
  return false;
}

function splitFullName(fullName: string | undefined) {
  if (!fullName) return { firstName: undefined, lastName: undefined };
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: undefined, lastName: undefined };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

function mapKeySkills(value: unknown): ResumeProfileData["keySkills"] {
  if (!Array.isArray(value)) return undefined;

  const skills = value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return pickString(item as UnknownRecord, "key_skill", "keySkill", "skill", "name");
      }
      return undefined;
    })
    .filter((skill): skill is string => Boolean(skill));

  return skills.length ? Array.from(new Set(skills)) : undefined;
}

function mapEducationDetails(value: unknown): ResumeProfileData["education"] {
  if (!Array.isArray(value)) return undefined;

  const education = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;
      return {
        title: pickString(record, "degree", "title"),
        institute: pickString(record, "institution", "institute", "school"),
        graduationYear: pickString(record, "year", "graduationYear"),
      };
    })
    .filter((entry) => Boolean(entry && (entry.title || entry.institute))) as NonNullable<
    ResumeProfileData["education"]
  >;

  return education.length ? education : undefined;
}

function extractProfilePayload(payload: UnknownRecord) {
  const root = payload.data && typeof payload.data === "object"
    ? (payload.data as UnknownRecord)
    : payload;
  const profile =
    root.profile && typeof root.profile === "object" ? (root.profile as UnknownRecord) : root;
  const profileVersion =
    root.profile_version && typeof root.profile_version === "object"
      ? (root.profile_version as UnknownRecord)
      : root;

  const fullName = pickString(profile, "full_name", "fullName", "name");
  const splitName = splitFullName(fullName);

  return {
    profileName: pickString(profile, "name"),
    profileVersionName: pickString(profileVersion, "name"),
    profile: {
      professionalTitle: pickString(profileVersion, "professional_title", "professionalTitle", "designation"),
      experienceYears:
        pickString(profileVersion, "experience_years", "experienceYears") ??
        pickString(profileVersion, "total_experience"),
      experienceMonths: pickString(profileVersion, "experience_months", "experienceMonths"),
      summary: pickString(profileVersion, "summary", "about_me"),
      salaryPerMonth: pickString(profileVersion, "salary_per_month", "salaryPerMonth"),
      salaryCurrency: pickString(profileVersion, "salary_currency", "salaryCurrency"),
      firstName: pickString(profile, "first_name", "firstName") ?? splitName.firstName,
      lastName: pickString(profile, "last_name", "lastName") ?? splitName.lastName,
      dob: pickString(profile, "dob", "date_of_birth"),
      gender: pickString(profile, "gender"),
      countryCode: pickString(profile, "country_code", "countryCode"),
      phone: pickString(profile, "phone", "mobile_no", "contact", "phone_number"),
      email: pickString(profile, "email", "user", "candidate_id"),
      altEmail: pickString(profile, "alt_email", "alternate_email"),
      nationality: pickString(profileVersion, "nationality", "country"),
      currentLocation: pickString(profile, "current_location", "currentLocation"),
      preferredLocation: pickString(profileVersion, "preferred_location", "preferredLocation"),
      keySkills: mapKeySkills(profileVersion.key_skills),
      education: mapEducationDetails(profileVersion.education_details),
    },
  };
}

async function parseJsonResponse(response: Response) {
  let data: UnknownRecord = {};
  try {
    data = (await response.json()) as UnknownRecord;
  } catch {
    // ignore
  }
  return data;
}

function ensureSuccessfulResponse(response: Response, data: UnknownRecord, fallback: string) {
  if (!response.ok) {
    throw new Error(parseApiErrorMessage(data) || `${fallback} (${response.status})`);
  }

  if (
    data.status === "error" ||
    data.code === "UNAUTHORIZED" ||
    typeof data.exc === "string" ||
    isFailedEnvelope(data)
  ) {
    throw new Error(parseApiErrorMessage(data) || fallback);
  }
}

export async function createPreProfile(formData: FormData): Promise<{ preProfileName: string; raw: UnknownRecord }> {
  const response = await fetch("/api/method/create_pre_profile/", {
    method: "POST",
    body: formData,
  });
  const data = await parseJsonResponse(response);
  ensureSuccessfulResponse(response, data, "Unable to create pre-profile.");

  const preProfileName =
    pickString(data, "pre_profile_name", "name") ??
    (data.message && typeof data.message === "object"
      ? pickString(data.message as UnknownRecord, "pre_profile_name", "name")
      : undefined);

  if (!preProfileName) {
    throw new Error("pre_profile_name was not returned by create_pre_profile.");
  }

  return { preProfileName, raw: data };
}

export async function generateProfileFromPreProfile(preProfileName: string): Promise<{ profileName: string; raw: UnknownRecord }> {
  const response = await fetch("/api/method/generate_profile_from_pre_profile_api/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pre_profile_name: preProfileName }),
  });
  const data = await parseJsonResponse(response);
  ensureSuccessfulResponse(response, data, "Unable to generate profile from pre-profile.");

  const profileName =
    pickString(data, "profile_name", "name") ??
    (data.message && typeof data.message === "object"
      ? pickString(data.message as UnknownRecord, "profile_name", "name")
      : undefined);

  if (!profileName) {
    throw new Error("profile_name was not returned by generate_profile_from_pre_profile_api.");
  }

  return { profileName, raw: data };
}

export async function getGeneratedProfile(
  candidateId: string | null | undefined,
  profileName: string
): Promise<GeneratedResumeProfileData> {
  const lookupName = candidateId?.trim() || profileName;
  const response = await fetch(
    `/api/method/get_data/?doctype=${encodeURIComponent("Profile")}&name=${encodeURIComponent(lookupName)}`,
    { method: "GET" }
  );
  const data = await parseJsonResponse(response);

  if (
    (!response.ok || data.status === "error" || data.code === "UNAUTHORIZED" || typeof data.exc === "string") &&
    lookupName !== profileName
  ) {
    const fallbackResponse = await fetch(
      `/api/method/get_data/?doctype=${encodeURIComponent("Profile")}&name=${encodeURIComponent(profileName)}`,
      { method: "GET" }
    );
    const fallbackData = await parseJsonResponse(fallbackResponse);
    ensureSuccessfulResponse(fallbackResponse, fallbackData, "Unable to load generated profile.");
    const mappedFallback = extractProfilePayload(fallbackData);
    return {
      ...mappedFallback.profile,
      profileName: mappedFallback.profileName,
      profileVersionName: mappedFallback.profileVersionName,
    };
  }

  ensureSuccessfulResponse(response, data, "Unable to load generated profile.");
  const mapped = extractProfilePayload(data);
  return {
    ...mapped.profile,
    profileName: mapped.profileName,
    profileVersionName: mapped.profileVersionName,
  };
}
