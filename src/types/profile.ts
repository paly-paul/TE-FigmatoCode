export interface ResumeEducationEntry {
  title?: string;
  institute?: string;
  specialization?: string;
  graduationYear?: string;
  score?: string;
}

export interface ResumeCertificationEntry {
  name?: string;
  issuing?: string;
  certificateNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  url?: string;
}

export interface ResumeExternalLinkEntry {
  label?: string;
  url?: string;
}

export interface ResumeProjectEntry {
  projectTitle?: string;
  customerCompany?: string;
  projectDescription?: string;
  responsibilities?: string;
  projectStartDate?: string;
  projectEndDate?: string;
  inProgress?: boolean;
}

export interface ResumeWorkExperienceEntry {
  jobTitle?: string;
  company?: string;
  duration?: string;
  responsibilities?: string[];
}

export interface ResumeLanguageEntry {
  language?: string;
  read?: string;
  write?: string;
  speak?: string;
}

export interface ResumeProfileData {
  professionalTitle?: string;
  experienceYears?: string;
  experienceMonths?: string;
  summary?: string;
  salaryPerMonth?: string;
  salaryCurrency?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
  altEmail?: string;
  nationality?: string;
  currentLocation?: string;
  preferredLocation?: string;
  education?: ResumeEducationEntry[];
  certifications?: ResumeCertificationEntry[];
  externalLinks?: ResumeExternalLinkEntry[];
  languages?: ResumeLanguageEntry[];
  keySkills?: string[];
  tools?: string[];
  projects?: ResumeProjectEntry[];
  workExperience?: ResumeWorkExperienceEntry[];
  cgpa?: string;
}
