"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserAndCandidate } from "./createUserAndCandidate";
import { sendCandidateSignupOtp } from "./otp";
import { clearPendingSignupForm, getPendingSignupForm, setPendingSignupForm } from "./pendingSignup";
import { DUPLICATE_EMAIL_MESSAGE } from "./constants";
import type { SignupFormValues } from "./types";
import { clearAuthSession, setCandidateId, setProfileName, setUserDisplayName } from "@/lib/authSession";
import { clearSessionLoginEmail, setSessionLoginEmail } from "@/lib/profileOnboarding";
import { clearResumeWizardSession } from "@/lib/profileSession";

export function useSignupSubmit() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: SignupFormValues) {
    setError(null);
    setIsLoading(true);
    try {
      clearAuthSession();
      clearSessionLoginEmail();
      clearPendingSignupForm();
      const normalizedEmail = form.email.trim().toLowerCase();
      const alreadyRegistered = await checkExistingSignupEmail(normalizedEmail);
      if (alreadyRegistered) {
        throw new Error(DUPLICATE_EMAIL_MESSAGE);
      }
      await sendCandidateSignupOtp(normalizedEmail);
      setPendingSignupForm({
        email: normalizedEmail,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: form.password,
      });
      router.push("/signup/confirmation/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return { submit, isLoading, error, clearError: () => setError(null) };
}

async function checkExistingSignupEmail(email: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const resolverUrl = new URL("/api/method/resolve_profile_name/", window.location.origin);
    resolverUrl.searchParams.set("email", email.trim().toLowerCase());
    const res = await fetch(resolverUrl.toString(), { method: "GET" });
    if (res.status === 404) return false;
    if (!res.ok) return false;
    const data = (await res.json()) as { profile_name?: string };
    return Boolean(data.profile_name?.trim());
  } catch {
    // Don't block signup when lookup fails; backend create call still enforces duplicate checks.
    return false;
  }
}

export async function completeSignupFromPending(): Promise<void> {
  const form = getPendingSignupForm();
  if (!form) {
    throw new Error("Signup session expired. Please create your account again.");
  }

  clearAuthSession();
  clearSessionLoginEmail();
  const data = await createUserAndCandidate(form);
  const msg = data.message;
  const candidateId =
    (msg && typeof msg === "object" && typeof (msg as { user?: unknown }).user === "string"
      ? (msg as { user: string }).user
      : null);
  const profileName = extractProfileName(data) ?? `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
  clearResumeWizardSession();
  if (candidateId) setCandidateId(candidateId);
  if (profileName) setProfileName(profileName);
  const displayName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
  if (displayName) setUserDisplayName(displayName);
  setSessionLoginEmail(form.email.trim().toLowerCase());
  clearPendingSignupForm();
}

function extractProfileName(data: Record<string, unknown>) {
  const message = data.message;
  const root = message && typeof message === "object" ? (message as Record<string, unknown>) : data;
  const candidates = [
    root.profile_name,
    root.profileName,
    root.profile,
    root.name,
    root.full_name,
    root.fullName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}
