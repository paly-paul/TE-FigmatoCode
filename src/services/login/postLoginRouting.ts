"use client";

import { getProfileGenerated, getProfileName, isLikelyDocId, setCandidateId, setProfileName } from "@/lib/authSession";
import { setDraftProfilePending } from "@/lib/draftProfilePending";
import { isProfileWizardCompleteOnServer } from "@/services/profile";

type UnknownRecord = Record<string, unknown>;

async function resolveProfileNameForLogin(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return "";

  const sessionProfileName = getProfileName()?.trim() ?? "";

  const resolverUrl = new URL("/api/method/get_profile_by_email/", window.location.origin);
  resolverUrl.searchParams.set("email", normalized);
  const resolverResponse = await fetch(resolverUrl.toString(), { method: "GET" });
  if (!resolverResponse.ok) return sessionProfileName;

  const resolverData = (await resolverResponse.json()) as Record<string, unknown>;
  const root =
    resolverData.data && typeof resolverData.data === "object"
      ? (resolverData.data as Record<string, unknown>)
      : resolverData.message && typeof resolverData.message === "object"
        ? (resolverData.message as Record<string, unknown>)
        : resolverData;
  const profile =
    root.profile && typeof root.profile === "object"
      ? (root.profile as Record<string, unknown>)
      : {};
  const resolved =
    typeof profile.name === "string" && profile.name.trim() ? profile.name.trim() : "";

  // Server lookup is authoritative for which PR- belongs to this email; session can be stale
  // (different account, renamed doc, or old tab).
  return resolved || sessionProfileName;
}

function extractResumeRef(input: unknown, depth = 0): string {
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
      const found = extractResumeRef(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof input !== "object") return "";

  const record = input as UnknownRecord;
  const keys = [
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

  for (const key of keys) {
    const found = extractResumeRef(record[key], depth + 1);
    if (found) return found;
  }
  for (const value of Object.values(record)) {
    const found = extractResumeRef(value, depth + 1);
    if (found) return found;
  }
  return "";
}

async function hasUploadedResume(profileName: string): Promise<boolean> {
  const profileUrl = new URL("/api/method/get_data/", window.location.origin);
  profileUrl.searchParams.set("doctype", "Profile");
  profileUrl.searchParams.set("name", profileName);
  const res = await fetch(profileUrl.toString(), { method: "GET" });
  if (!res.ok) return false;
  const data = (await res.json()) as UnknownRecord;
  return Boolean(extractResumeRef(data));
}

function hasMeaningfulProfileProgress(input: unknown, depth = 0): boolean {
  if (depth > 6 || input == null) return false;
  if (Array.isArray(input)) return input.some((item) => hasMeaningfulProfileProgress(item, depth + 1));
  if (typeof input !== "object") return false;

  const record = input as UnknownRecord;
  const titleCandidates = [
    record.professional_title,
    record.professionalTitle,
    record.professional_summary,
    record.professionalSummary,
  ];
  if (titleCandidates.some((value) => typeof value === "string" && value.trim().length > 0)) return true;

  const listCandidates = [
    record.key_skills,
    record.keySkills,
    record.skills_table,
    record.projects_table,
    record.education_qualifications,
    record.work_experience,
    record.certification_table,
  ];
  if (listCandidates.some((value) => Array.isArray(value) && value.length > 0)) return true;

  const completionCandidates = [record.profile_completion, record.completion_percentage, record.profile_percent];
  for (const candidate of completionCandidates) {
    if (typeof candidate === "number" && candidate > 0) return true;
    if (typeof candidate === "string" && Number.parseFloat(candidate) > 0) return true;
  }

  return Object.values(record).some((value) => hasMeaningfulProfileProgress(value, depth + 1));
}

async function hasStartedProfileFlow(profileName: string): Promise<boolean> {
  const profileUrl = new URL("/api/method/get_data/", window.location.origin);
  profileUrl.searchParams.set("doctype", "Profile");
  profileUrl.searchParams.set("name", profileName);
  const res = await fetch(profileUrl.toString(), { method: "GET" });
  if (!res.ok) return false;
  const data = (await res.json()) as UnknownRecord;
  return hasMeaningfulProfileProgress(data);
}

async function isProfileStateInDraft(profileName: string): Promise<boolean> {
  try {
    const url = new URL("/api/method/get_data/", window.location.origin);
    url.searchParams.set("doctype", "Profile");
    url.searchParams.set("name", profileName);
    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) return false;
    const data = (await res.json()) as UnknownRecord;
    const root =
      data.data && typeof data.data === "object"
        ? (data.data as UnknownRecord)
        : data.message && typeof data.message === "object"
          ? (data.message as UnknownRecord)
          : data;
    const profile =
      root.profile && typeof root.profile === "object" ? (root.profile as UnknownRecord) : {};
    const profileVersion =
      root.profile_version && typeof root.profile_version === "object"
        ? (root.profile_version as UnknownRecord)
        : {};
    const profileState =
      typeof profile.state === "string" ? profile.state.trim().toLowerCase() : "";
    const versionState =
      typeof profileVersion.state === "string" ? profileVersion.state.trim().toLowerCase() : "";
    return profileState === "draft" || versionState === "draft";
  } catch {
    return false;
  }
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
  console.log("[login-routing] start", {
    email: email.trim().toLowerCase(),
    sessionProfileGenerated,
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

    const [isComplete, isDraft] = await Promise.all([
      isProfileWizardCompleteOnServer(profileName),
      isProfileStateInDraft(profileName),
    ]);
    console.log("[login-routing] profile-check:session", {
      profileName,
      isComplete,
      isDraft,
      sessionProfileGenerated,
    });
    if (isComplete) {
      console.log("[login-routing] decision", {
        reason: "server-profile-complete:session",
        destination: "/dashboard",
      });
      return "/dashboard";
    }
    if (isDraft) {
      setDraftProfilePending();
      console.log("[login-routing] decision", {
        reason: "server-profile-draft",
        destination: "/dashboard",
      });
      return "/dashboard";
    }
    const resumeUploaded = await hasUploadedResume(profileName);
    const profileStarted = resumeUploaded ? true : await hasStartedProfileFlow(profileName);
    console.log("[login-routing] decision", {
      reason: profileStarted
        ? "server-profile-incomplete:resume-uploaded"
        : "server-profile-incomplete:no-progress",
      destination: profileStarted ? "/profile/create/basic-details" : "/profile/create",
    });
    return profileStarted ? "/profile/create/basic-details" : "/profile/create";
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
