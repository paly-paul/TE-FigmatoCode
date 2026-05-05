import { getCandidateId, getUserDisplayName } from "@/lib/authSession";
import { readResumeProfile } from "@/lib/profileSession";

/** Legacy: keyed by whatever was in session as "candidate id" (email or doc id). */
const PROFILE_COMPLETE_KEY_PREFIX = "te_profile_complete:";

const LOGIN_EMAIL_KEY = "te_login_email";

function profileCompleteKeyForEmail(email: string): string {
  return `te_profile_complete_email:${email.trim().toLowerCase()}`;
}

export function setSessionLoginEmail(email: string): void {
  if (typeof window === "undefined") return;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  window.localStorage.setItem(LOGIN_EMAIL_KEY, normalized);
}

export function getSessionLoginEmail(): string | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(LOGIN_EMAIL_KEY);
  return v && v.trim() ? v.trim().toLowerCase() : null;
}

/** First / last name and email from signup session (editable defaults for profile create Basic Details). */
export function getLoginIdentityPrefill(): {
  email: string;
  firstName: string;
  lastName: string;
} {
  if (typeof window === "undefined") {
    return { email: "", firstName: "", lastName: "" };
  }

  const sessionEmail = getSessionLoginEmail()?.trim() || "";
  const displayName = getUserDisplayName()?.trim() || "";

  const derivedFullNameFromDisplayOrEmail =
    displayName ||
    (sessionEmail
      ? sessionEmail
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .split(/\s+/)
          .filter(Boolean)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ")
      : "");

  const nameParts = derivedFullNameFromDisplayOrEmail.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  return {
    email: sessionEmail,
    firstName,
    lastName,
  };
}

export function clearSessionLoginEmail(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOGIN_EMAIL_KEY);
}

export function isProfileComplete(): boolean {
  if (typeof window === "undefined") return false;

  const email = getSessionLoginEmail();
  if (email && window.localStorage.getItem(profileCompleteKeyForEmail(email)) === "1") {
    return true;
  }

  const candidateId = getCandidateId();
  if (candidateId && window.localStorage.getItem(`${PROFILE_COMPLETE_KEY_PREFIX}${candidateId}`) === "1") {
    return true;
  }

  return false;
}

export function markProfileComplete(): void {
  if (typeof window === "undefined") return;

  const email =
    getSessionLoginEmail() ||
    (() => {
      const id = getCandidateId();
      if (id && id.includes("@")) return id.trim().toLowerCase();
      return null;
    })() ||
    (() => {
      const e = readResumeProfile()?.email;
      return typeof e === "string" && e.includes("@") ? e.trim().toLowerCase() : null;
    })();

  const candidateId = getCandidateId();

  if (email) {
    window.localStorage.setItem(profileCompleteKeyForEmail(email), "1");
  }
  if (candidateId) {
    window.localStorage.setItem(`${PROFILE_COMPLETE_KEY_PREFIX}${candidateId}`, "1");
  }
}
