"use client";

import { getProfileGenerated, getProfileName, isLikelyDocId, setCandidateId, setProfileName } from "@/lib/authSession";
import { isProfileComplete } from "@/lib/profileOnboarding";
import { isProfileWizardCompleteOnServer } from "@/services/profile";

type UnknownRecord = Record<string, unknown>;

async function resolveProfileNameForLogin(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return "";

  let profileName = getProfileName()?.trim() ?? "";
  if (profileName) return profileName;

  const resolverUrl = new URL("/api/method/resolve_profile_name/", window.location.origin);
  resolverUrl.searchParams.set("email", normalized);
  const resolverResponse = await fetch(resolverUrl.toString(), { method: "GET" });
  if (!resolverResponse.ok) return "";
  const resolverData = (await resolverResponse.json()) as { profile_name?: string };
  profileName = typeof resolverData.profile_name === "string" ? resolverData.profile_name.trim() : "";
  return profileName;
}

function extractExistingUploadedResumeRef(input: unknown, depth = 0): string {
  if (depth > 6 || input == null) return "";
  if (typeof input === "string") {
    const value = input.trim();
    if (!value) return "";
    const lower = value.toLowerCase();
    if (lower.includes(".pdf") || lower.includes("/files/") || lower.includes("resume")) return value;
    return "";
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = extractExistingUploadedResumeRef(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof input !== "object") return "";

  const record = input as UnknownRecord;
  const directKeys = [
    "updated_resume",
    "updatedResume",
    "resume",
    "resume_file",
    "resumeFile",
    "resume_url",
    "resumeUrl",
    "profile_resume",
    "profileResume",
    "profile_doc",
    "profileDoc",
  ];
  for (const key of directKeys) {
    const found = extractExistingUploadedResumeRef(record[key], depth + 1);
    if (found) return found;
  }

  for (const value of Object.values(record)) {
    const found = extractExistingUploadedResumeRef(value, depth + 1);
    if (found) return found;
  }
  return "";
}

function hasMeaningfulValue(input: unknown): boolean {
  if (input == null) return false;
  if (typeof input === "string") return Boolean(input.trim());
  if (typeof input === "number") return Number.isFinite(input) && input !== 0;
  if (typeof input === "boolean") return input;
  if (Array.isArray(input)) return input.some((v) => hasMeaningfulValue(v));
  if (typeof input === "object") {
    const record = input as UnknownRecord;
    return Object.values(record).some((v) => hasMeaningfulValue(v));
  }
  return false;
}

function looksLikeBasicDetailsStarted(payload: unknown, depth = 0): boolean {
  if (depth > 6 || payload == null) return false;
  if (typeof payload !== "object") return false;

  const record = payload as UnknownRecord;
  const directKeys = [
    // Basic-details page inputs / common backend fields
    "first_name",
    "firstName",
    "last_name",
    "lastName",
    "full_name",
    "fullName",
    "contact_no",
    "contact",
    "phone",
    "mobile_no",
    "country_code",
    "countryCode",
    "dob",
    "date_of_birth",
    "gender",
    "nationality",
    "current_location",
    "currentLocation",
    "preferred_location",
    "preferredLocation",
    "professional_title",
    "professionalTitle",
    "total_experience",
    "totalExperience",
    "experience_years",
    "experienceYears",
    "experience_months",
    "experienceMonths",
    "key_skills",
    "keySkills",
    "skills_table",
    "education_details",
    "education",
    "education_qualifications",
  ];

  for (const key of directKeys) {
    if (key in record && hasMeaningfulValue(record[key])) return true;
  }

  // Common nesting from `get_data` response
  const nestedRoots = [record.data, record.message, record.profile, record.profile_version];
  for (const nested of nestedRoots) {
    if (looksLikeBasicDetailsStarted(nested, depth + 1)) return true;
  }

  for (const value of Object.values(record)) {
    if (looksLikeBasicDetailsStarted(value, depth + 1)) return true;
  }
  return false;
}

async function getServerOnboardingSignals(profileName: string): Promise<{
  resumeUploaded: boolean;
  basicDetailsStarted: boolean;
}> {
  if (typeof window === "undefined") return { resumeUploaded: false, basicDetailsStarted: false };
  const profileUrl = new URL("/api/method/get_data/", window.location.origin);
  profileUrl.searchParams.set("doctype", "Profile");
  profileUrl.searchParams.set("name", profileName);
  const profileRes = await fetch(profileUrl.toString(), { method: "GET" });
  if (!profileRes.ok) return { resumeUploaded: false, basicDetailsStarted: false };
  const profileData = (await profileRes.json()) as UnknownRecord;
  return {
    resumeUploaded: Boolean(extractExistingUploadedResumeRef(profileData)),
    basicDetailsStarted: looksLikeBasicDetailsStarted(profileData),
  };
}

/**
 * After a successful login (cookies set), decide if the user should skip the
 * create-profile wizard:
 * - true if they already completed the wizard on this device (localStorage), or
 * - true if the server has a Profile with a full skills-projects–style submission
 *   (professional title + key skills), not merely an empty/new Profile doc.
 */
export async function shouldSkipProfileWizardAfterLogin(email: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const sessionProfileGenerated = getProfileGenerated();
  const localProfileComplete = isProfileComplete();
  console.log("[login-routing] start", {
    email: email.trim().toLowerCase(),
    sessionProfileGenerated,
    localProfileComplete,
    sessionProfileName: getProfileName(),
  });

  if (!email.trim()) return false;
  if (localProfileComplete) {
    console.log("[login-routing] decision", { reason: "local-profile-complete", skipWizard: true });
    return true;
  }

  try {
    const profileName = await resolveProfileNameForLogin(email);
    if (!profileName) {
      console.log("[login-routing] decision", {
        reason: "missing-profile-name",
        skipWizard: false,
      });
      return false;
    }
    if (isLikelyDocId(profileName)) {
      setCandidateId(profileName);
    }
    setProfileName(profileName);

    const isComplete = await isProfileWizardCompleteOnServer(profileName);
    console.log("[login-routing] profile-check:session", {
      profileName,
      isComplete,
      sessionProfileGenerated,
    });
    if (isComplete) {
      console.log("[login-routing] decision", { reason: "server-profile-complete:session", skipWizard: true });
      return true;
    }
    console.log("[login-routing] decision", { reason: "server-profile-incomplete:session", skipWizard: false });
    return false;
  } catch {
    /* treat as no server profile */
  }

  console.log("[login-routing] decision", { reason: "no-skip-signal", skipWizard: false });
  return false;
}

export async function getPostLoginDestination(email: string): Promise<string> {
  const skipWizard = await shouldSkipProfileWizardAfterLogin(email);
  if (skipWizard) return "/dashboard";

  if (typeof window === "undefined") return "/profile/create";
  try {
    const profileName = await resolveProfileNameForLogin(email);
    if (profileName) {
      const signals = await getServerOnboardingSignals(profileName);
      // Important: resume upload alone should NOT jump the user into basic-details.
      // Only route to basic-details when the server indicates the user started that step.
      if (signals.basicDetailsStarted) {
        return `/profile/create/basic-details?profile=${encodeURIComponent(profileName)}`;
      }
      return "/profile/create";
    }
  } catch {
    // fallback
  }
  return "/profile/create";
}
