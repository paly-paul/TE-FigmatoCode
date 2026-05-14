export const DRAFT_PROFILE_PENDING_KEY = "te_draftProfilePending";

export function setDraftProfilePending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DRAFT_PROFILE_PENDING_KEY, "1");
  } catch {
    // ignore
  }
}

export function getDraftProfilePending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DRAFT_PROFILE_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearDraftProfilePending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_PROFILE_PENDING_KEY);
  } catch {
    // ignore
  }
}
