/** Persisted when the user completes the create-profile wizard (until cleared). */
const PROFILE_COMPLETE_KEY = "te_profile_complete";

export function isProfileComplete(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PROFILE_COMPLETE_KEY) === "1";
}

export function markProfileComplete(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_COMPLETE_KEY, "1");
}
