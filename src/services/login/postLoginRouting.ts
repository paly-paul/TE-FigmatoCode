"use client";

import { getProfileGenerated, getProfileName, isLikelyDocId, setCandidateId, setProfileName } from "@/lib/authSession";
import { isProfileComplete } from "@/lib/profileOnboarding";
import { isProfileWizardCompleteOnServer } from "@/services/profile";

/**
 * After a successful login (cookies set), decide if the user should skip the
 * create-profile wizard:
 * - true if they already completed the wizard on this device (localStorage), or
 * - true if the server has a Profile with a full skills-projects–style submission
 *   (professional title + key skills), not merely an empty/new Profile doc.
 */
export async function shouldSkipProfileWizardAfterLogin(email: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const localProfileComplete = isProfileComplete();
  const sessionProfileGenerated = getProfileGenerated();
  const sessionProfileName = getProfileName();
  console.log("[login-routing] start", {
    email: email.trim().toLowerCase(),
    localProfileComplete,
    sessionProfileGenerated,
    sessionProfileName,
  });

  // Only skip the wizard when the *server* says the profile is complete.
  // Local/session flags can be stale (e.g. profile created but not completed),
  // so they should never route a user straight to the dashboard.

  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  try {
    let profileName = sessionProfileName?.trim() ?? "";
    if (!profileName) {
      const resolverUrl = new URL("/api/method/resolve_profile_name/", window.location.origin);
      resolverUrl.searchParams.set("email", normalized);
      const resolverResponse = await fetch(resolverUrl.toString(), { method: "GET" });
      if (resolverResponse.ok) {
        const resolverData = (await resolverResponse.json()) as { profile_name?: string };
        if (typeof resolverData.profile_name === "string" && resolverData.profile_name.trim()) {
          profileName = resolverData.profile_name.trim();
        }
      }
    }
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

    // Backend contract: candidate_login marks existing generated profile users.
    // Trust this first to avoid false negatives from secondary profile-shape checks.
    if (sessionProfileGenerated === true) {
      console.log("[login-routing] decision", {
        reason: "profile-generated-per-login-response",
        profileName,
        skipWizard: true,
      });
      return true;
    }

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
