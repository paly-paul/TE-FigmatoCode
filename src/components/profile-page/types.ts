export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issued: string;
  expiry: string | null;
  externalUrl?: string;
}

export interface ExperienceItem {
  id: string;
  title: string;
  years: number;
  externalUrl?: string;
}

export interface ToolItem {
  id: string;
  name: string;
  years: number;
}

export interface Project {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
  responsibilities: string[];
}

export interface EducationItem {
  degree: string;
  school: string;
  specialization: string;
  graduationYear: string;
  score: string;
}

export interface LanguageItem {
  id: string;
  name: string;
  read: string;
  write: string;
  speak: string;
}

export interface ProfileData {
  name: string;
  profileImageUrl?: string;
  verified: boolean;
  title: string;
  location: string;
  countryCode: string;
  phone: string;
  github: string;
  linkedin: string;
  website: string;
  externalLinks: {
    label: string;
    url: string;
    platform: "github" | "linkedin" | "website";
  }[];
  summary: string;
  experience: string;
  salary: string;
  availableDate: string;
  profileStrength: number;
  visibilityScore: number;
  persona: string;
  personalInfo: {
    dob: string;
    gender: string;
    emails: string[];
    nationality: string;
    currentLocation: string;
    preferredLocation: string;
  };
  education: EducationItem[];
  languages: LanguageItem[];
  skills: string[];
  skillsWithUrls?: { name: string; experience?: number; url?: string }[];
  workAuthorizations: string[];
  preferredIndustries: string[];
  certifications: Certification[];
  experienceItems: ExperienceItem[];
  tools: ToolItem[];
  projects: Project[];
}
