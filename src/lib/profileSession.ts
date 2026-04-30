import { ResumeProfileData } from "@/types/profile";

const STORAGE_KEY = "resumeProfile";
const RESUME_SKILLS_KEY = "resumeSkills";
const UPLOADED_RESUME_META_KEY = "uploadedResumeMeta";
const PROFILE_PIC_STORAGE_KEY = "resumeProfilePic";
const LOGIN_EMAIL_KEY = "te_login_email";
const PERSISTED_DRAFT_KEY_PREFIX = "te_resume_profile_draft:";

function draftKeyForEmail(email: string): string {
  return `${PERSISTED_DRAFT_KEY_PREFIX}${email.trim().toLowerCase()}`;
}

function getDraftEmailFromSessionStorage(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ResumeProfileData;
    const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
    return email || null;
  } catch {
    return null;
  }
}

function getActiveDraftEmail(): string | null {
  if (typeof window === "undefined") return null;
  const fromLogin = window.localStorage.getItem(LOGIN_EMAIL_KEY)?.trim().toLowerCase() || "";
  if (fromLogin) return fromLogin;
  return getDraftEmailFromSessionStorage();
}

export function readResumeProfile(): ResumeProfileData | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as ResumeProfileData;
    } catch {
      return null;
    }
  }

  const email = getActiveDraftEmail();
  if (!email) return null;
  const persistedRaw = window.localStorage.getItem(draftKeyForEmail(email));
  if (!persistedRaw) return null;
  try {
    const parsed = JSON.parse(persistedRaw) as ResumeProfileData;
    // Re-hydrate into sessionStorage so existing page logic keeps working.
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return null;
  }
}

export function upsertResumeProfile(incoming: ResumeProfileData) {
  if (typeof window === "undefined") return;
  const existing = readResumeProfile() ?? {};
  const merged = mergeResumeProfile(existing, incoming);

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage issues
  }

  const email = (incoming.email || merged.email || getActiveDraftEmail() || "").trim().toLowerCase();
  if (!email) return;
  try {
    window.localStorage.setItem(draftKeyForEmail(email), JSON.stringify(merged));
  } catch {
    // ignore storage issues
  }
}

export function clearResumeProfile() {
  if (typeof window === "undefined") return;
  const email = getActiveDraftEmail();
  window.sessionStorage.removeItem(STORAGE_KEY);
  if (!email) return;
  window.localStorage.removeItem(draftKeyForEmail(email));
}

export function clearResumeWizardSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(RESUME_SKILLS_KEY);
  window.sessionStorage.removeItem(UPLOADED_RESUME_META_KEY);
  window.sessionStorage.removeItem(PROFILE_PIC_STORAGE_KEY);
}

export function readResumeSkillsDraft<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(RESUME_SKILLS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  const email = getActiveDraftEmail();
  if (!email) return null;
  const persistedRaw = window.localStorage.getItem(`${draftKeyForEmail(email)}:${RESUME_SKILLS_KEY}`);
  if (!persistedRaw) return null;
  try {
    const parsed = JSON.parse(persistedRaw) as T;
    window.sessionStorage.setItem(RESUME_SKILLS_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return null;
  }
}

export function writeResumeSkillsDraft(payload: unknown): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(payload);
  try {
    window.sessionStorage.setItem(RESUME_SKILLS_KEY, serialized);
  } catch {
    // ignore storage errors
  }

  const email = getActiveDraftEmail();
  if (!email) return;
  try {
    window.localStorage.setItem(`${draftKeyForEmail(email)}:${RESUME_SKILLS_KEY}`, serialized);
  } catch {
    // ignore storage errors
  }
}

function mergeResumeProfile(existing: ResumeProfileData, incoming: ResumeProfileData): ResumeProfileData {
  const merged: ResumeProfileData = { ...existing };
  (Object.keys(incoming) as Array<keyof ResumeProfileData>).forEach((key) => {
    assignDefinedValue(merged, key, incoming[key]);
  });
  return merged;
}

function assignDefinedValue<Key extends keyof ResumeProfileData>(
  target: ResumeProfileData,
  key: Key,
  value: ResumeProfileData[Key] | undefined,
) {
  if (value === undefined) return;
  target[key] = value;
}
