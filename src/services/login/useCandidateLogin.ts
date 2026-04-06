"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { candidateLogin } from "./candidateLogin";
import type { CandidateLoginValues } from "./types";
import {
  clearAuthSession,
  isLikelyDocId,
  setCandidateId,
  setProfileName,
  setUserDisplayName,
} from "@/lib/authSession";
import { clearSessionLoginEmail, setSessionLoginEmail } from "@/lib/profileOnboarding";
import { clearResumeWizardSession } from "@/lib/profileSession";

export function useCandidateLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(values: CandidateLoginValues) {
    setError(null);
    setIsLoading(true);
    try {
      clearAuthSession();
      clearSessionLoginEmail();
      const data = await candidateLogin(values);
      const candidateId = extractProfileId(data) ?? values.email.trim();
      const profileName = extractProfileName(data, values.email.trim());
      clearResumeWizardSession();
      setCandidateId(candidateId);
      if (profileName) setProfileName(profileName);
      const displayName = extractDisplayNameFromLogin(data);
      if (displayName) setUserDisplayName(displayName);
      setSessionLoginEmail(values.email.trim().toLowerCase());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  return { submit, isLoading, error, clearError: () => setError(null), router };
}

function extractProfileId(data: Record<string, unknown>) {
  const candidateUser =
    data.candidate_user && typeof data.candidate_user === "object"
      ? (data.candidate_user as Record<string, unknown>)
      : null;

  const candidates = [
    candidateUser?.profile,
    candidateUser?.profile_name,
    candidateUser?.profileName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && isLikelyDocId(candidate)) {
      return candidate.trim();
    }
  }

  const message = data.message;
  if (message && typeof message === "object") {
    const root = message as Record<string, unknown>;
    const nested = root.candidate_user;
    if (nested && typeof nested === "object") {
      const nestedCandidateUser = nested as Record<string, unknown>;
      const nestedProfile = nestedCandidateUser.profile;
      if (typeof nestedProfile === "string" && isLikelyDocId(nestedProfile)) {
        return nestedProfile.trim();
      }
    }
  }

  return null;
}

function extractProfileName(data: Record<string, unknown>, emailFallback: string) {
  const candidateUser =
    data.candidate_user && typeof data.candidate_user === "object"
      ? (data.candidate_user as Record<string, unknown>)
      : null;
  const message = data.message;
  const root = message && typeof message === "object" ? (message as Record<string, unknown>) : data;
  const candidates = [
    candidateUser?.profile,
    candidateUser?.profile_name,
    candidateUser?.profileName,
    root.profile_name,
    root.profileName,
    root.profile,
    root.name,
    root.full_name,
    root.fullName,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      isLikelyDocId(candidate) &&
      candidate.trim() !== emailFallback
    ) {
      return candidate.trim();
    }
  }

  return null;
}

function extractDisplayNameFromLogin(data: Record<string, unknown>): string | null {
  const candidateUser =
    data.candidate_user && typeof data.candidate_user === "object"
      ? (data.candidate_user as Record<string, unknown>)
      : null;
  const message = data.message;
  const root = message && typeof message === "object" ? (message as Record<string, unknown>) : data;
  const nestedCu =
    root.candidate_user && typeof root.candidate_user === "object"
      ? (root.candidate_user as Record<string, unknown>)
      : null;

  const candidates = [
    candidateUser?.full_name,
    candidateUser?.fullName,
    candidateUser?.name,
    nestedCu?.full_name,
    nestedCu?.fullName,
    nestedCu?.name,
    root.full_name,
    root.fullName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const t = candidate.trim();
    if (!t) continue;
    if (t.includes("@")) continue;
    if (isLikelyDocId(t)) continue;
    return t;
  }

  return null;
}
