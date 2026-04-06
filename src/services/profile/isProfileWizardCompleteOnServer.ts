import { getCandidateProfileData } from "./getCandidateProfile";

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
    console.log("[profile-check] server-data", {
      profileName,
      title,
      skills,
      email: data.email,
      currentLocation: data.currentLocation,
    });
    return Boolean(title && skills > 0);
  } catch (error) {
    console.error("[profile-check] server-data:error", { profileName, error });
    return false;
  }
}
