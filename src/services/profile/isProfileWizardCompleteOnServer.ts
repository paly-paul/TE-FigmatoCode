import { getCandidateProfileData } from "./getCandidateProfile";

type UnknownRecord = Record<string, unknown>;

function isSubmittedProfileState(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "open" ||
    normalized === "submitted" ||
    normalized === "published" ||
    normalized === "completed"
  );
}

// "active" is only meaningful for profile_status fields (set explicitly on wizard submit),
// not for document workflow state fields where "open"/"active" fire on profile creation.
function isSubmittedProfileStatus(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "submitted" ||
    normalized === "published" ||
    normalized === "completed"
  );
}

function isActiveProfileStatus(value: string): boolean {
  return value.trim().toLowerCase() === "active";
}

function hasMultipleProfileVersions(profile: UnknownRecord, currentVersionName: string): boolean {
  const history = Array.isArray(profile.history) ? profile.history : [];
  if (history.length === 0) return false;
  const names = history
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const record = entry as UnknownRecord;
      const versionValue = record.profile_version;
      return typeof versionValue === "string" ? versionValue.trim() : "";
    })
    .filter((name, index, arr) => Boolean(name) && arr.indexOf(name) === index);

  if (!currentVersionName) return names.length > 1;
  return names.some((name) => name !== currentVersionName);
}

async function hasAnyPreviouslySubmittedVersion(
  profile: UnknownRecord,
  currentVersionName: string
): Promise<boolean> {
  const history = Array.isArray(profile.history) ? profile.history : [];
  if (history.length === 0) return false;

  const versionNames = history
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const record = entry as UnknownRecord;
      const versionValue = record.profile_version;
      return typeof versionValue === "string" ? versionValue.trim() : "";
    })
    .filter((name, index, arr) => Boolean(name) && arr.indexOf(name) === index)
    .filter((name) => name !== currentVersionName)
    .slice(0, 8);

  if (versionNames.length === 0) return false;

  try {
    const checks = await Promise.all(
      versionNames.map(async (versionName) => {
        const res = await fetch(
          `/api/method/get_data/?doctype=${encodeURIComponent("Profile Version")}&name=${encodeURIComponent(versionName)}`,
          { method: "GET" }
        );
        if (!res.ok) return false;

        const payload = (await res.json()) as UnknownRecord;
        const root =
          payload.data && typeof payload.data === "object"
            ? (payload.data as UnknownRecord)
            : payload.message && typeof payload.message === "object"
              ? (payload.message as UnknownRecord)
              : payload;

        const state = typeof root.state === "string" ? root.state : "";
        const status = typeof root.profile_status === "string" ? root.profile_status : "";
        return isSubmittedProfileState(state) || isSubmittedProfileStatus(status);
      })
    );
    return checks.some(Boolean);
  } catch {
    return false;
  }
}

async function isSubmittedProfileVersionByName(versionName: string): Promise<boolean> {
  const normalized = versionName.trim();
  if (!normalized) return false;
  try {
    const res = await fetch(
      `/api/method/get_data/?doctype=${encodeURIComponent("Profile Version")}&name=${encodeURIComponent(normalized)}`,
      { method: "GET" }
    );
    if (!res.ok) return false;

    const payload = (await res.json()) as UnknownRecord;
    const root =
      payload.data && typeof payload.data === "object"
        ? (payload.data as UnknownRecord)
        : payload.message && typeof payload.message === "object"
          ? (payload.message as UnknownRecord)
          : payload;
    const state = typeof root.state === "string" ? root.state : "";
    const status = typeof root.profile_status === "string" ? root.profile_status : "";
    return isSubmittedProfileState(state) || isSubmittedProfileStatus(status);
  } catch {
    return false;
  }
}

function parseCompletionPercent(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number.parseFloat(trimmed.replace(/%/g, ""));
    if (!Number.isFinite(numeric)) return null;
    return Math.max(0, Math.min(100, numeric));
  }
  return null;
}

function extractCompletionPercent(input: unknown, depth = 0): number | null {
  if (depth > 6 || input == null) return null;
  const direct = parseCompletionPercent(input);
  if (direct != null) return direct;
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = extractCompletionPercent(item, depth + 1);
      if (found != null) return found;
    }
    return null;
  }
  if (typeof input !== "object") return null;

  const record = input as UnknownRecord;
  const keys = ["profile_completion", "completion_percentage", "profile_percent", "profile_strength"];
  for (const key of keys) {
    if (key in record) {
      const found = extractCompletionPercent(record[key], depth + 1);
      if (found != null) return found;
    }
  }
  for (const [key, value] of Object.entries(record)) {
    if (/(?:profile[_\s-]*completion|completion[_\s-]*percentage|profile[_\s-]*percent|profile[_\s-]*strength)/i.test(key)) {
      const found = extractCompletionPercent(value, depth + 1);
      if (found != null) return found;
    }
  }
  for (const value of Object.values(record)) {
    const found = extractCompletionPercent(value, depth + 1);
    if (found != null) return found;
  }
  return null;
}

/**
 * True when the Profile on the server looks like the user finished the
 * create-profile flow (skills-projects submit), not merely that a Profile row exists.
 */
export async function isProfileWizardCompleteOnServer(
  profileName: string
): Promise<boolean> {
  try {
    const data = await getCandidateProfileData(profileName);
    const title = data.professionalTitle?.trim();
    const skills = data.keySkills?.length ?? 0;

    // Also verify profile/version state; "Draft" should not be treated as completed.
    const stateResponse = await fetch(
      `/api/method/get_data/?doctype=${encodeURIComponent("Profile")}&name=${encodeURIComponent(profileName)}`,
      { method: "GET" }
    );
    let stateData: UnknownRecord = {};
    try {
      stateData = (await stateResponse.json()) as UnknownRecord;
    } catch {
      stateData = {};
    }

    const root =
      stateData.data && typeof stateData.data === "object"
        ? (stateData.data as UnknownRecord)
        : stateData.message && typeof stateData.message === "object"
          ? (stateData.message as UnknownRecord)
          : stateData;
    const profile =
      root.profile && typeof root.profile === "object" ? (root.profile as UnknownRecord) : {};
    const profileVersion =
      root.profile_version && typeof root.profile_version === "object"
        ? (root.profile_version as UnknownRecord)
        : {};
    const profileState = typeof profile.state === "string" ? profile.state.trim().toLowerCase() : "";
    const versionState =
      typeof profileVersion.state === "string" ? profileVersion.state.trim().toLowerCase() : "";
    const rootState = typeof root.state === "string" ? root.state.trim().toLowerCase() : "";
    const profileStatus =
      typeof profile.profile_status === "string" ? profile.profile_status.trim().toLowerCase() : "";
    const versionStatus =
      typeof profileVersion.profile_status === "string"
        ? profileVersion.profile_status.trim().toLowerCase()
        : "";
    const rootStatus =
      typeof root.profile_status === "string" ? root.profile_status.trim().toLowerCase() : "";
    const isSubmittedCurrent =
      // Document workflow state: "open"/"active" fire on doc creation, not on wizard submit.
      isSubmittedProfileState(profileState) ||
      isSubmittedProfileState(versionState) ||
      isSubmittedProfileState(rootState) ||
      // profile_status fields are supplementary, but do not treat "Active" as submit proof.
      isSubmittedProfileStatus(profileStatus) ||
      isSubmittedProfileStatus(versionStatus) ||
      isSubmittedProfileStatus(rootStatus) ||
      isSubmittedProfileStatus(data.profileStatus ?? "");

    const currentVersionName =
      typeof profile.current_profile_version === "string" ? profile.current_profile_version.trim() : "";
    const currentVersionSubmitted = currentVersionName
      ? await isSubmittedProfileVersionByName(currentVersionName)
      : false;
    const hasSubmittedHistory = !(isSubmittedCurrent || currentVersionSubmitted)
      ? await hasAnyPreviouslySubmittedVersion(profile, currentVersionName)
      : false;
    const hasActiveStatusSignal =
      isActiveProfileStatus(profileStatus) ||
      isActiveProfileStatus(versionStatus) ||
      isActiveProfileStatus(rootStatus) ||
      isActiveProfileStatus(data.profileStatus ?? "");
    const editDraftActiveFallback =
      hasActiveStatusSignal && hasMultipleProfileVersions(profile, currentVersionName);
    const isSubmitted =
      isSubmittedCurrent || currentVersionSubmitted || hasSubmittedHistory || editDraftActiveFallback;

    // A draft with no submit signal (current or historical) is incomplete.
    const isDraft = (profileState === "draft" || versionState === "draft" || rootState === "draft") && !isSubmitted;

    const completionPercent =
      extractCompletionPercent(profileVersion) ??
      extractCompletionPercent(profile) ??
      extractCompletionPercent(root);

    console.log("[profile-check] server-data", {
      profileName,
      title,
      skills,
      profileState: profileState || null,
      versionState: versionState || null,
      rootState: rootState || null,
      profileStatus: profileStatus || null,
      versionStatus: versionStatus || null,
      rootStatus: rootStatus || null,
      mappedProfileStatus: data.profileStatus || null,
      isSubmittedCurrent,
      currentVersionSubmitted,
      hasSubmittedHistory,
      hasActiveStatusSignal,
      editDraftActiveFallback,
      isSubmitted,
      isDraft,
      completionPercent,
      email: data.email,
      currentLocation: data.currentLocation,
    });
    // Route to dashboard only when the profile is not draft, has submitted signal, and
    // has the minimum required wizard fields (title + at least one skill).
    return Boolean(!isDraft && isSubmitted && Boolean(title) && skills > 0);
  } catch (error) {
    console.error("[profile-check] server-data:error", { profileName, error });
    return false;
  }
}
