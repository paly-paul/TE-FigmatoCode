const CANDIDATE_ID_KEY = "te_candidate_id";
const PROFILE_NAME_KEY = "te_profile_name";
const USER_DISPLAY_NAME_KEY = "te_user_display_name";

export function isLikelyDocId(value: string | null | undefined) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/\s/.test(trimmed)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  return /[A-Za-z]+-\d/.test(trimmed);
}

export function setCandidateId(candidateId: string) {
  if (typeof window === "undefined") return;
  const value = candidateId.trim();
  if (!value) return;
  window.sessionStorage.setItem(CANDIDATE_ID_KEY, value);
}

export function getCandidateId(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(CANDIDATE_ID_KEY);
  return value && value.trim() ? value : null;
}

export function clearCandidateId() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CANDIDATE_ID_KEY);
}

export function setProfileName(profileName: string) {
  if (typeof window === "undefined") return;
  const value = profileName.trim();
  if (!value) return;
  window.sessionStorage.setItem(PROFILE_NAME_KEY, value);
}

export function getProfileName(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(PROFILE_NAME_KEY);
  if (stored && stored.trim()) return stored.trim();
  return null;
}

export function clearProfileName() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PROFILE_NAME_KEY);
}

/** Human-readable name for nav / welcome (not the Profile document id). */
export function setUserDisplayName(name: string) {
  if (typeof window === "undefined") return;
  const value = name.trim();
  if (!value) return;
  window.sessionStorage.setItem(USER_DISPLAY_NAME_KEY, value);
}

export function getUserDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(USER_DISPLAY_NAME_KEY);
  if (stored && stored.trim()) return stored.trim();
  return null;
}

export function clearUserDisplayName() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(USER_DISPLAY_NAME_KEY);
}

export function clearAuthSession() {
  clearCandidateId();
  clearProfileName();
  clearUserDisplayName();
}

