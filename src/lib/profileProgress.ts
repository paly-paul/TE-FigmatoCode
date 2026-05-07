import { hasProceededPastResumeUpload, readResumeProfile } from "@/lib/profileSession";
import type {
  ResumeExternalLinkEntry,
  ResumeProfileData,
  ResumeProjectEntry,
  ResumeWorkExperienceEntry,
} from "@/types/profile";

type BasicInputs = {
  professionalTitle?: string;
  experienceYears?: string;
  experienceMonths?: string;
  salaryPerMonth?: string;
  salaryCurrency?: string;
  summary?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  currentLocation?: string;
  educationComplete?: boolean;
  certificationsComplete?: boolean;
  externalLinks?: ResumeExternalLinkEntry[];
};

function truthyTrim(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function isBasicProfessionalComplete(b: BasicInputs): boolean {
  if (!truthyTrim(b.professionalTitle)) return false;
  if (!truthyTrim(b.experienceYears)) return false;
  if (!truthyTrim(b.experienceMonths)) return false;
  if (!truthyTrim(b.salaryPerMonth)) return false;
  if (!truthyTrim(b.salaryCurrency)) return false;
  const summary = typeof b.summary === "string" ? b.summary.trim() : "";
  if (!summary || summary.length < 40) return false;
  return true;
}

function isBasicPersonalComplete(b: BasicInputs): boolean {
  if (!truthyTrim(b.firstName)) return false;
  if (!truthyTrim(b.lastName)) return false;
  if (!truthyTrim(b.dob)) return false;
  if (!truthyTrim(b.gender)) return false;
  if (!truthyTrim(b.countryCode)) return false;
  if (!truthyTrim(b.phone)) return false;
  if (!truthyTrim(b.email)) return false;
  if (!truthyTrim(b.nationality)) return false;
  if (!truthyTrim(b.currentLocation)) return false;
  return true;
}

function isExternalLinksComplete(links: ResumeExternalLinkEntry[] | undefined): boolean {
  if (!Array.isArray(links) || links.length === 0) return false;
  return links.some((e) => truthyTrim(e.label) && truthyTrim(e.url));
}

function isSkillsSectionComplete(skills: string[] | undefined): boolean {
  return Array.isArray(skills) && skills.some((s) => truthyTrim(s));
}

function isWorkExperienceSectionComplete(experience: ResumeWorkExperienceEntry[] | undefined): boolean {
  if (!Array.isArray(experience) || experience.length === 0) return false;
  // Consider section complete if at least one entry has a jobTitle/company and duration.
  return experience.some((e) => (truthyTrim(e.jobTitle) || truthyTrim(e.company)) && truthyTrim(e.duration));
}

function isProjectsSectionComplete(projects: ResumeProjectEntry[] | undefined): boolean {
  if (!Array.isArray(projects) || projects.length === 0) return false;
  return projects.some(
    (p) =>
      truthyTrim(p.projectTitle) &&
      truthyTrim(p.customerCompany) &&
      truthyTrim(p.projectDescription) &&
      truthyTrim(p.responsibilities)
  );
}

export function computeOverallProfileProgress(args?: {
  profile?: ResumeProfileData;
  basicOverride?: Partial<BasicInputs>;
  // Live state from Skills & Projects screen (more accurate than session until saved).
  liveSkills?: string[];
  liveProjects?: Array<{
    projectTitle?: string;
    customerCompany?: string;
    projectDescription?: string;
    responsibilities?: string;
    projectStartDate?: string;
    projectEndDate?: string;
    inProgress?: boolean;
  }>;
  liveExperiences?: Array<{ experience?: string; experienceYears?: string; experienceReference?: string }>;
}): number {
  const profile = args?.profile ?? readResumeProfile() ?? {};
  const basic: BasicInputs = {
    professionalTitle: profile.professionalTitle,
    experienceYears: profile.experienceYears,
    experienceMonths: profile.experienceMonths,
    salaryPerMonth: profile.salaryPerMonth,
    salaryCurrency: profile.salaryCurrency,
    summary: profile.summary,
    firstName: profile.firstName,
    lastName: profile.lastName,
    dob: profile.dob,
    gender: profile.gender,
    countryCode: profile.countryCode,
    phone: profile.phone,
    email: profile.email,
    nationality: profile.nationality,
    currentLocation: profile.currentLocation,
    educationComplete: Boolean(profile.education?.some((e) => truthyTrim(e.title) && truthyTrim(e.institute))),
    certificationsComplete: Boolean(profile.certifications?.some((e) => truthyTrim(e.name) && truthyTrim(e.issuing))),
    externalLinks: profile.externalLinks,
    ...(args?.basicOverride ?? {}),
  };

  const uploadDone = hasProceededPastResumeUpload();

  // Basic Details contributes 30 points across 5 sections.
  const basicSections = [
    isBasicProfessionalComplete(basic),
    isBasicPersonalComplete(basic),
    Boolean(basic.educationComplete),
    Boolean(basic.certificationsComplete),
    isExternalLinksComplete(basic.externalLinks),
  ];
  const basicRatio = basicSections.filter(Boolean).length / basicSections.length;

  // Skills & Projects contributes 60 points across 3 sections.
  const skillsFromProfile = profile.keySkills ?? [];
  const projectsFromProfile = profile.projects ?? [];
  const workExperienceFromProfile = profile.workExperience ?? [];

  const liveSkills = args?.liveSkills;
  const liveProjects = args?.liveProjects;
  const liveExperiences = args?.liveExperiences;

  const skillsComplete = isSkillsSectionComplete(liveSkills ?? skillsFromProfile);

  const projectsComplete = liveProjects
    ? liveProjects.some(
        (p) =>
          truthyTrim(p.projectTitle) &&
          truthyTrim(p.customerCompany) &&
          truthyTrim(p.projectStartDate) &&
          truthyTrim(p.projectDescription) &&
          truthyTrim(p.responsibilities)
      )
    : isProjectsSectionComplete(projectsFromProfile);

  // liveExperiences are tool/skill entries (experience + years) entered on the skills-projects
  // screen. When not provided (basic-details page), fall back to session work history only if
  // it actually has job entries — do NOT use resume job history as a proxy for tool experience.
  const workExperienceComplete = liveExperiences
    ? liveExperiences.some((e) => truthyTrim(e.experience) && truthyTrim(e.experienceYears))
    : isWorkExperienceSectionComplete(workExperienceFromProfile);

  const skillsSections = [skillsComplete, workExperienceComplete, projectsComplete];
  const skillsRatio = skillsSections.filter(Boolean).length / skillsSections.length;

  const percent = (uploadDone ? 10 : 0) + basicRatio * 30 + skillsRatio * 60;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

