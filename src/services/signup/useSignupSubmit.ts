"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserAndCandidate } from "./createUserAndCandidate";
import { sendCandidateSignupOtp } from "./otp";
import { clearPendingSignupForm, getPendingSignupForm, setPendingSignupForm } from "./pendingSignup";
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
