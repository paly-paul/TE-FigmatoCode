"use client";

import { getProfileGenerated, getProfileName, isLikelyDocId, setCandidateId, setProfileName } from "@/lib/authSession";
import { isProfileWizardCompleteOnServer } from "@/services/profile";

export type PostLoginDestination = "/dashboard" | "/profile/create/basic-details" | "/profile/create";

/**
 * After successful login, route users by server state:
 * - completed/generated profile => dashboard
 * - existing but incomplete profile => basic-details (resume wizard)
 * - no profile found => upload-resume entry step
 */
export async function getPostLoginDestination(email: string): Promise<PostLoginDestination> {
  if (typeof window === "undefined") return "/profile/create";

  const sessionProfileGenerated = getProfileGenerated();
  const sessionProfileName = getProfileName();
  console.log("[login-routing] start", {
    email: email.trim().toLowerCase(),
    sessionProfileGenerated,
    sessionProfileName,
  });

  const normalized = email.trim().toLowerCase();
  if (!normalized) return "/profile/create";

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
