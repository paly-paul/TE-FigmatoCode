import { ResumeProfileData } from "@/types/profile";

const STORAGE_KEY = "resumeProfile";

export function readResumeProfile(): ResumeProfileData | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ResumeProfileData;
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
}

export function clearResumeProfile() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
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
