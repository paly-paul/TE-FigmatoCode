import type { ResumeProfileData } from "@/types/profile";
import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type UnknownRecord = Record<string, unknown>;

function pickString(obj: UnknownRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function extractDataRoot(payload: UnknownRecord): UnknownRecord {
  const topLevelData = payload.data;
  if (topLevelData && typeof topLevelData === "object") {
    return topLevelData as UnknownRecord;
  }

  const msg = payload.message;
  if (msg && typeof msg === "object") {
    const asRecord = msg as UnknownRecord;
    const nestedData = asRecord.data;
    if (nestedData && typeof nestedData === "object") {
      return nestedData as UnknownRecord;
    }
    return asRecord;
  }
  return payload;
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
        const record = item as UnknownRecord;
        return pickString(record, "key_skill", "keySkill", "skill", "name");
      }
      return undefined;
    })
    .filter((skill): skill is string => Boolean(skill));

  return skills.length ? Array.from(new Set(skills)) : undefined;
}

function mapEducationDetails(value: unknown): ResumeProfileData["education"] {
  if (!Array.isArray(value)) return undefined;

  const education = (value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;
      return {
        title: pickString(record, "degree", "title"),
        institute: pickString(record, "institution", "institute", "school"),
        graduationYear: pickString(record, "year", "graduationYear"),
      };
    })
    // Keep entries that look meaningful, but avoid strict type-predicate issues.
    .filter((entry) => Boolean(entry && (entry.title || entry.institute))) as Array<
    NonNullable<ResumeProfileData["education"]>[number]
  >);

  return education.length ? education : undefined;
}

function mapToResumeProfileData(root: UnknownRecord): ResumeProfileData {
  const profileRecord =
    root.profile && typeof root.profile === "object" ? (root.profile as UnknownRecord) : root;
  const profileVersion =
    root.profile_version && typeof root.profile_version === "object"
      ? (root.profile_version as UnknownRecord)
      : root;
  const fullName = pickString(profileRecord, "full_name", "fullName", "name");
  const splitName = splitFullName(fullName);

  return {
    professionalTitle: pickString(profileVersion, "professional_title", "professionalTitle", "designation"),
    experienceYears:
      pickString(profileVersion, "experience_years", "experienceYears") ??
      pickString(profileVersion, "total_experience"),
    experienceMonths: pickString(profileVersion, "experience_months", "experienceMonths"),
    summary: pickString(profileVersion, "summary", "about_me"),
    salaryPerMonth: pickString(profileVersion, "salary_per_month", "salaryPerMonth"),
    salaryCurrency: pickString(profileVersion, "salary_currency", "salaryCurrency"),
    firstName: pickString(profileRecord, "first_name", "firstName") ?? splitName.firstName,
    lastName: pickString(profileRecord, "last_name", "lastName") ?? splitName.lastName,
    dob: pickString(profileRecord, "dob", "date_of_birth"),
    gender: pickString(profileRecord, "gender"),
    countryCode: pickString(profileRecord, "country_code", "countryCode"),
    phone: pickString(profileRecord, "phone", "mobile_no", "contact", "phone_number"),
    email: pickString(profileRecord, "email", "user", "candidate_id"),
    altEmail: pickString(profileRecord, "alt_email", "alternate_email"),
    nationality: pickString(profileVersion, "nationality", "country"),
    currentLocation: pickString(profileRecord, "current_location", "currentLocation"),
    preferredLocation: pickString(profileVersion, "preferred_location", "preferredLocation"),
    keySkills: mapKeySkills(profileVersion.key_skills),
    education: mapEducationDetails(profileVersion.education_details),
  };
}

export async function getCandidateProfileData(candidateId: string): Promise<ResumeProfileData> {
  const res = await fetch(`/api/method/get_data/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doctype: "Profile", name: candidateId }),
  });

  let data: UnknownRecord = {};
  try {
    data = (await res.json()) as UnknownRecord;
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  if (data.status === "error" || data.code === "UNAUTHORIZED") {
    throw new Error(parseApiErrorMessage(data) || "Unable to load profile data.");
  }

  if (typeof data.exc === "string" && data.exc) {
    throw new Error(parseApiErrorMessage(data));
  }

  return mapToResumeProfileData(extractDataRoot(data));
}

