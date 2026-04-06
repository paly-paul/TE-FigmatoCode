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
    // If we already know the Profile document id, check completeness directly.
    if (sessionProfileName) {
      const isComplete = await isProfileWizardCompleteOnServer(sessionProfileName);
      console.log("[login-routing] profile-check:session", {
        profileName: sessionProfileName,
        isComplete,
      });
      if (isComplete) {
        console.log("[login-routing] decision", { reason: "server-profile-complete:session", skipWizard: true });
        return true;
      }
      console.log("[login-routing] decision", { reason: "server-profile-incomplete:session", skipWizard: false });
      return false;
    }

    const url = new URL("/api/method/resolve_profile_name/", window.location.origin);
    url.searchParams.set("email", normalized);
    const r = await fetch(url.toString(), { credentials: "same-origin" });
    const j = (await r.json()) as { profile_name?: string; error?: string };
    console.log("[login-routing] resolve_profile_name", {
      status: r.status,
      ok: r.ok,
      body: j,
    });
    if (r.ok && typeof j.profile_name === "string" && j.profile_name.trim()) {
      const profileName = j.profile_name.trim();
      if (isLikelyDocId(profileName)) {
        setCandidateId(profileName);
      }
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

      // If a Profile exists but it is not complete, route the user into the wizard.
      // This is common right after sign-up or when we created a minimal Profile server-side.
      console.log("[login-routing] decision", { reason: "server-profile-incomplete", skipWizard: false });
      return false;
    }
  } catch {
    /* treat as no server profile */
  }

  console.log("[login-routing] decision", { reason: "no-skip-signal", skipWizard: false });
  return false;
}
