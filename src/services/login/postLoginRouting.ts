"use client";

import { getProfileGenerated, getProfileName, isLikelyDocId, setCandidateId, setProfileName } from "@/lib/authSession";
import { isProfileComplete } from "@/lib/profileOnboarding";
import { hasProceededPastResumeUpload } from "@/lib/profileSession";
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
      const resumeUploaded = await hasUploadedResume(profileName);
      if (resumeUploaded) {
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
