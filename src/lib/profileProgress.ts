import { hasProceededPastResumeUpload, readResumeProfile } from "@/lib/profileSession";
import type {
  ResumeEducationEntry,
  ResumeCertificationEntry,
  ResumeExternalLinkEntry,
  ResumeLanguageEntry,
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
  workAuthorization?: string;
  preferredIndustry?: string;
  education?: ResumeEducationEntry[];
  certifications?: ResumeCertificationEntry[];
  externalLinks?: ResumeExternalLinkEntry[];
  languages?: ResumeLanguageEntry[];
};

function truthyTrim(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

// Professional Info — max 20 pts
// title=3, expYears=3, expMonths=1, salary=3, currency=1, summary(>=40)=4, workAuthorization=3, preferredIndustry=2
function scoreProfessional(b: BasicInputs): number {
  let pts = 0;
  if (truthyTrim(b.professionalTitle)) pts += 3;
  if (truthyTrim(b.experienceYears)) pts += 3;
  if (truthyTrim(b.experienceMonths)) pts += 1;
  if (truthyTrim(b.salaryPerMonth)) pts += 3;
  if (truthyTrim(b.salaryCurrency)) pts += 1;
  const summary = typeof b.summary === "string" ? b.summary.trim() : "";
  if (summary.length >= 40) pts += 4;
  if (truthyTrim(b.workAuthorization)) pts += 3;
  if (truthyTrim(b.preferredIndustry)) pts += 2;
  return pts;
}

// Personal Info — max 15 pts
// firstName=1, lastName=1, dob=2, gender=1, countryCode=1, phone=2, email=4, nationality=1, currentLocation=2
function scorePersonal(b: BasicInputs): number {
  let pts = 0;
  if (truthyTrim(b.firstName)) pts += 1;
  if (truthyTrim(b.lastName)) pts += 1;
  if (truthyTrim(b.dob)) pts += 2;
  if (truthyTrim(b.gender)) pts += 1;
  if (truthyTrim(b.countryCode)) pts += 1;
  if (truthyTrim(b.phone)) pts += 2;
  if (truthyTrim(b.email)) pts += 4;
  if (truthyTrim(b.nationality)) pts += 1;
  if (truthyTrim(b.currentLocation)) pts += 2;
  return pts;
}

// Averages scores across all entries so incomplete additional sets reduce the section score.
function avgScore(scores: number[], maxPerEntry: number): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((s, n) => s + n, 0);
  return Math.round(total / scores.length);
}

// Education — all entries averaged, max 10 pts per entry (title=6, institute=4)
function scoreEducation(entries: ResumeEducationEntry[] | undefined): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  return avgScore(
    entries.map((e) => (truthyTrim(e.title) ? 6 : 0) + (truthyTrim(e.institute) ? 4 : 0)),
    10
  );
}

// Certifications — all entries averaged, max 5 pts per entry (name=3, issuing=2)
function scoreCertification(entries: ResumeCertificationEntry[] | undefined): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  return avgScore(
    entries.map((e) => (truthyTrim(e.name) ? 3 : 0) + (truthyTrim(e.issuing) ? 2 : 0)),
    5
  );
}

// External Links — all entries averaged, max 5 pts per entry (label=2, url=3)
function scoreExternalLink(entries: ResumeExternalLinkEntry[] | undefined): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  return avgScore(
    entries.map((e) => (truthyTrim(e.label) ? 2 : 0) + (truthyTrim(e.url) ? 3 : 0)),
    5
  );
}

// Languages — all entries averaged, max 5 pts per entry (language name=5)
function scoreLanguage(entries: ResumeLanguageEntry[] | undefined): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  return avgScore(entries.map((e) => (truthyTrim(e.language) ? 5 : 0)), 5);
}

// Key Skills — binary, max 10 pts
function scoreKeySkills(skills: string[] | undefined): number {
  return Array.isArray(skills) && skills.some((s) => truthyTrim(s)) ? 10 : 0;
}

// Work Experience (session entries) — all entries averaged, max 10 pts per entry
// (jobTitle or company)=5, duration=5
function scoreWorkExperience(entries: ResumeWorkExperienceEntry[] | undefined): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  return avgScore(
    entries.map(
      (e) =>
        (truthyTrim(e.jobTitle) || truthyTrim(e.company) ? 5 : 0) +
        (truthyTrim(e.duration) ? 5 : 0)
    ),
    10
  );
}

// Live experience entries (skills-projects screen) — all entries averaged, max 10 pts per entry
// experience=5, experienceYears=5
function scoreLiveExperience(
  entries: Array<{ experience?: string; experienceYears?: string; experienceReference?: string }> | undefined
): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  return avgScore(
    entries.map((e) => (truthyTrim(e.experience) ? 5 : 0) + (truthyTrim(e.experienceYears) ? 5 : 0)),
    10
  );
}

// Projects — all entries averaged, max 10 pts per entry
// title=2, company=2, startDate=2, description(>=30)=2, responsibilities(>=20)=2
function scoreProject(
  entries:
    | Array<{
        projectTitle?: string;
        customerCompany?: string;
        projectStartDate?: string;
        projectDescription?: string;
        responsibilities?: string;
      }>
    | ResumeProjectEntry[]
    | undefined
): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  return avgScore(
    entries.map((p) => {
      let pts = 0;
      if (truthyTrim(p.projectTitle)) pts += 2;
      if (truthyTrim(p.customerCompany)) pts += 2;
      if (truthyTrim((p as { projectStartDate?: string }).projectStartDate)) pts += 2;
      const desc = typeof p.projectDescription === "string" ? p.projectDescription.trim() : "";
      if (desc.length >= 30) pts += 2;
      const resp = typeof p.responsibilities === "string" ? p.responsibilities.trim() : "";
      if (resp.length >= 20) pts += 2;
      return pts;
    }),
    10
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
    workAuthorization: profile.workAuthorization,
    preferredIndustry: profile.preferredIndustry,
    education: profile.education,
    certifications: profile.certifications,
    externalLinks: profile.externalLinks,
    languages: profile.languages,
    ...(args?.basicOverride ?? {}),
  };

  const uploadPts = hasProceededPastResumeUpload() ? 10 : 0;

  // Basic Details: 20 + 15 + 10 + 5 + 5 + 5 = 60 pts
  const basicPts =
    scoreProfessional(basic) +
    scorePersonal(basic) +
    scoreEducation(basic.education) +
    scoreCertification(basic.certifications) +
    scoreExternalLink(basic.externalLinks) +
    scoreLanguage(basic.languages);

  // Skills & Projects: 10 + 10 + 10 = 30 pts
  const liveSkills = args?.liveSkills;
  const liveProjects = args?.liveProjects;
  const liveExperiences = args?.liveExperiences;

  const skillsPts = scoreKeySkills(liveSkills ?? profile.keySkills ?? []);

  const workExpPts = liveExperiences
    ? scoreLiveExperience(liveExperiences)
    : scoreWorkExperience(profile.workExperience);

  const projectsPts = scoreProject(liveProjects ?? profile.projects);

  const skillsSectionPts = skillsPts + workExpPts + projectsPts;

  const total = uploadPts + basicPts + skillsSectionPts;
  return Math.max(0, Math.min(100, Math.round(total)));
}
