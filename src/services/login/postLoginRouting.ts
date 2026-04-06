"use client";

import { setProfileName } from "@/lib/authSession";
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

  if (isProfileComplete()) return true;

  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  try {
    const url = new URL("/api/method/resolve_profile_name/", window.location.origin);
    url.searchParams.set("candidate_id", normalized);
    const r = await fetch(url.toString(), { credentials: "same-origin" });
    const j = (await r.json()) as { profile_name?: string };
    if (r.ok && typeof j.profile_name === "string" && j.profile_name.trim()) {
      const profileName = j.profile_name.trim();
      setProfileName(profileName);
      return await isProfileWizardCompleteOnServer(profileName);
    }
  } catch {
    /* treat as no server profile */
  }

  return false;
}
