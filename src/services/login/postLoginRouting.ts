"use client";

import { setProfileName } from "@/lib/authSession";
import { isProfileComplete, markProfileComplete } from "@/lib/profileOnboarding";

/**
 * After a successful login (cookies set), decide if the user should skip the
 * create-profile wizard: local flag, or an existing Profile on Frappe.
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
      markProfileComplete();
      setProfileName(j.profile_name.trim());
      return true;
    }
  } catch {
    /* treat as no server profile */
  }

  return false;
}
