"use client";

import type { SignupFormValues } from "./types";

const PENDING_SIGNUP_KEY = "te_pending_signup_form";

export function setPendingSignupForm(form: SignupFormValues): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(form));
}

export function getPendingSignupForm(): SignupFormValues | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING_SIGNUP_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SignupFormValues;
    if (!parsed?.email || !parsed?.firstName || !parsed?.lastName || !parsed?.password) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingSignupForm(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
}
