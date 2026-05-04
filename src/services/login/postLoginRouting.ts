"use client";

import { getProfileGenerated, getProfileName, isLikelyDocId, setCandidateId, setProfileName } from "@/lib/authSession";
import { isProfileWizardCompleteOnServer } from "@/services/profile";
import type { ResumeProfileData } from "@/types/profile";

type UnknownRecord = Record<string, unknown>;

/** True when the Profile document has substantive wizard data beyond a bare signup/upload shell. */
function profileLooksEstablishedOnClient(data: ResumeProfileData): boolean {
  if (data.professionalTitle?.trim()) return true;
  if (data.summary?.trim()) return true;
  const skills = data.keySkills?.length ?? 0;
  const tools = data.tools?.length ?? 0;
  if (skills > 0 || tools > 0) return true;
  const work = data.workExperience?.length ?? 0;
  const projects = data.projects?.length ?? 0;
  if (work > 0 || projects > 0) return true;
  const edu = data.education?.length ?? 0;
  return edu > 0;
}

async function isProfileEstablishedOnServer(profileName: string): Promise<boolean> {
  try {
    const data = await getCandidateProfileData(profileName);
    return profileLooksEstablishedOnClient(data);
  } catch {
    return false;
  }
}

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

async function hasUploadedResume(profileName: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const profileUrl = new URL("/api/method/get_data/", window.location.origin);
  profileUrl.searchParams.set("doctype", "Profile");
  profileUrl.searchParams.set("name", profileName);
  const profileRes = await fetch(profileUrl.toString(), { method: "GET" });
  if (!profileRes.ok) return false;
  const profileData = (await profileRes.json()) as UnknownRecord;
  return Boolean(extractExistingUploadedResumeRef(profileData));
}

export type PostLoginDestination = "/dashboard" | "/profile/create/basic-details" | "/profile/create";

/**
 * After successful login, route users by server state:
 * - completed/generated profile => dashboard
 * - existing but incomplete profile => basic-details (resume wizard)
 * - no profile found => upload-resume entry step
 * -
 */
export async function getPostLoginDestination(email: string): Promise<PostLoginDestination> {
  if (typeof window === "undefined") return "/profile/create";

  const sessionProfileGenerated = getProfileGenerated();
  const localProfileComplete = isProfileComplete();
  console.log("[login-routing] start", {
    email: email.trim().toLowerCase(),
    sessionProfileGenerated,
    localProfileComplete,
    sessionProfileName: getProfileName(),
  });

  const normalized = email.trim().toLowerCase();
  if (!normalized) return "/profile/create";

  try {
    const profileName = await resolveProfileNameForLogin(email);
    if (!profileName) {
      console.log("[login-routing] decision", {
        reason: "missing-profile-name",
        destination: "/profile/create",
      });
      return "/profile/create";
    }
    if (isLikelyDocId(profileName)) {
      setCandidateId(profileName);
    }
    setProfileName(profileName);

    // Backend contract: candidate_login marks existing generated profile users.
    // Trust this first to avoid false negatives from secondary profile-shape checks.
    if (sessionProfileGenerated === true) {
      console.log("[login-routing] decision", {
        reason: "profile-generated-per-login-response",
        profileName,
        destination: "/dashboard",
      });
      return "/dashboard";
    }

    const isComplete = await isProfileWizardCompleteOnServer(profileName);
    console.log("[login-routing] profile-check:session", {
      profileName,
      isComplete,
      sessionProfileGenerated,
    });
    if (isComplete) {
      console.log("[login-routing] decision", {
        reason: "server-profile-complete:session",
        destination: "/dashboard",
      });
      return "/dashboard";
    }
    console.log("[login-routing] decision", {
      reason: "server-profile-incomplete:session",
      destination: "/profile/create/basic-details",
    });
    return "/profile/create/basic-details";
  } catch {
    /* treat as no server profile */
  }

  console.log("[login-routing] decision", { reason: "no-skip-signal", destination: "/profile/create" });
  return "/profile/create";
}

export async function shouldSkipProfileWizardAfterLogin(email: string): Promise<boolean> {
  const destination = await getPostLoginDestination(email);
  return destination === "/dashboard";
}

export async function getPostLoginDestination(email: string): Promise<string> {
  const skipWizard = await shouldSkipProfileWizardAfterLogin(email);
  if (skipWizard) return "/dashboard";

  if (typeof window === "undefined") return "/profile/create";
  try {
    const profileName = await resolveProfileNameForLogin(email);
    if (profileName) {
      const resumeUploaded = await hasUploadedResume(profileName);
      if (resumeUploaded) {
        // New device may not have the local “clicked Next after upload” flag. If the server profile
        // already looks established or complete, routing is handled via skipWizard above—but if those
        // checks ever disagree, avoid sending established users back to resume upload here.
        if ((await isProfileEstablishedOnServer(profileName)) || (await isProfileWizardCompleteOnServer(profileName))) {
          return "/dashboard";
        }
        // Only send users to basic-details if they already proceeded past the resume-upload step
        // on this device; otherwise keep them on the upload screen.
        if (hasProceededPastResumeUpload()) {
          return `/profile/create/basic-details?profile=${encodeURIComponent(profileName)}`;
        }
        return "/profile/create";
      }
      return "/profile/create";
    }
  } catch {
    // fallback
  }
  return "/profile/create";
}
