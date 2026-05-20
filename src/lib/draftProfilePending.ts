const DRAFT_PROFILE_PENDING_KEY = "te_draftProfilePending";

// Key by email so the flag is per-user and survives logout/login cycles.
// Falls back to the bare key if no email is available.
function getDraftPendingKey(): string {
  if (typeof window === "undefined") return DRAFT_PROFILE_PENDING_KEY;
  const email = window.localStorage.getItem("te_login_email")?.trim().toLowerCase() ?? "";
  return email ? `${DRAFT_PROFILE_PENDING_KEY}:${email}` : DRAFT_PROFILE_PENDING_KEY;
}

export function setDraftProfilePending(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getDraftPendingKey(), "1");
  } catch {
    // ignore
  }
}

export function getDraftProfilePending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(getDraftPendingKey()) === "1";
  } catch {
    return false;
  }
}

export function clearDraftProfilePending(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getDraftPendingKey());
    // Also clear the legacy sessionStorage key from older sessions.
    window.sessionStorage.removeItem(DRAFT_PROFILE_PENDING_KEY);
  } catch {
    // ignore
  }
}
