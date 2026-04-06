"use client";

import { getProfileGenerated, getProfileName, setProfileName } from "@/lib/authSession";
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

  if (localProfileComplete) {
    console.log("[login-routing] decision", { reason: "local-profile-complete", skipWizard: true });
    return true;
  }
  if (sessionProfileGenerated === true) {
    console.log("[login-routing] decision", { reason: "session-profile-generated", skipWizard: true });
    return true;
  }
  if (sessionProfileName) {
    console.log("[login-routing] decision", {
      reason: "session-profile-name",
      skipWizard: true,
      profileName: sessionProfileName,
    });
    return true;
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  try {
    const url = new URL("/api/method/resolve_profile_name/", window.location.origin);
    url.searchParams.set("candidate_id", normalized);
    const r = await fetch(url.toString(), { credentials: "same-origin" });
    const j = (await r.json()) as { profile_name?: string; error?: string };
    console.log("[login-routing] resolve_profile_name", {
      status: r.status,
      ok: r.ok,
      body: j,
    });
    if (r.ok && typeof j.profile_name === "string" && j.profile_name.trim()) {
      const profileName = j.profile_name.trim();
      setProfileName(profileName);
      const isComplete = await isProfileWizardCompleteOnServer(profileName);
      console.log("[login-routing] profile-check", {
        profileName,
        isComplete,
      });
      if (isComplete) {
        console.log("[login-routing] decision", { reason: "server-profile-complete", skipWizard: true });
        return true;
      }

      // Some backend profiles exist but do not satisfy the stricter frontend
      // completeness heuristic yet. Presence of a persisted Profile document is
      // enough to keep returning users out of the create-profile entry screen.
      console.log("[login-routing] decision", { reason: "profile-name-resolved", skipWizard: true });
      return true;
    }
  } catch {
    /* treat as no server profile */
  }

  console.log("[login-routing] decision", { reason: "no-skip-signal", skipWizard: false });
  return false;
}
