import { ResumeProfileData } from "@/types/profile";

const STORAGE_KEY = "resumeProfile";
const RESUME_SKILLS_KEY = "resumeSkills";
const UPLOADED_RESUME_META_KEY = "uploadedResumeMeta";
const PROFILE_PIC_STORAGE_KEY = "resumeProfilePic";

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

export function clearResumeWizardSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(RESUME_SKILLS_KEY);
  window.sessionStorage.removeItem(UPLOADED_RESUME_META_KEY);
  window.sessionStorage.removeItem(PROFILE_PIC_STORAGE_KEY);
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
  if (value === undefined || value === null) return;
  if (typeof value === "string" && value.trim() === "") {
    const existing = target[key];
    if (
      existing !== undefined &&
      existing !== null &&
      !(typeof existing === "string" && existing.trim() === "")
    ) {
      return;
    }
  }
  target[key] = value;
}
