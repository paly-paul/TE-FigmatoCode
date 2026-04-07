import { getCandidateProfileData } from "./getCandidateProfile";

type UnknownRecord = Record<string, unknown>;

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
    const isDraft = profileState === "draft" || versionState === "draft";

    console.log("[profile-check] server-data", {
      profileName,
      title,
      skills,
      profileState: profileState || null,
      versionState: versionState || null,
      email: data.email,
      currentLocation: data.currentLocation,
    });
    return Boolean(title && skills > 0 && !isDraft);
  } catch (error) {
    console.error("[profile-check] server-data:error", { profileName, error });
    return false;
  }
}
