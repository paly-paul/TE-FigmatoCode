import { inflateRawSync, inflateSync } from "zlib";
import path from "path";
import { ResumeProfileData } from "@/types/profile";

const SECTION_BREAK = /\n(?=[A-Z][A-Z\s/&,-]{2,}\n)/g;
const DEGREE_KEYWORDS = [
  "b.tech",
  "btech",
  "b.e",
  "be ",
  "bachelor",
  "master",
  "m.tech",
  "mtech",
  "mba",
  "mca",
  "bca",
  "phd",
  "doctor",
  "diploma",
];
const CERTIFICATION_KEYWORDS = [
  "certification",
  "certificate",
  "certified",
  "license",
  "credential",
];
const LANGUAGE_NAMES = [
  "english",
  "hindi",
  "spanish",
  "french",
  "german",
  "arabic",
  "tamil",
  "telugu",
  "kannada",
  "malayalam",
  "marathi",
  "bengali",
  "gujarati",
  "portuguese",
  "japanese",
  "chinese",
];
const SKILL_KEYWORDS = [
  "react",
  "next.js",
  "nextjs",
  "typescript",
  "javascript",
  "node.js",
  "nodejs",
  "express",
  "mongodb",
  "postgresql",
  "mysql",
  "aws",
  "docker",
  "kubernetes",
  "python",
  "java",
  "c#",
  ".net",
  "angular",
  "vue",
  "html",
  "css",
  "tailwind",
  "figma",
  "git",
  "github",
  "gitlab",
  "jira",
  "postman",
  "redux",
  "graphql",
  "rest api",
];

export async function parseResumeFile(file: File): Promise<ResumeProfileData> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  console.log("📄 Processing file:", file.name, "Type:", lowerName.endsWith(".pdf") ? "PDF" : "DOCX");

  let text = "";
  if (lowerName.endsWith(".docx")) {
    text = extractTextFromDocx(buffer);
  } else if (lowerName.endsWith(".pdf")) {
    text = await extractTextFromPdf(buffer); // ← IMPORTANT: Added await
  } else {
    console.warn("⚠️ Unsupported file type:", file.name);
  }

  console.log("📝 Total extracted text length:", text.length);
  console.log("📝 First 300 chars:", text.slice(0, 300));

  const profile = sanitizeResumeProfile(buildProfileFromText(text, file.name), normalizedTextForFiltering(text));
  
  console.log("✅ Parsed profile fields:", Object.keys(profile));
  console.log("📊 Full profile data:", profile);
  
  return profile;
}

function buildProfileFromText(text: string, fileName: string): ResumeProfileData {
  const normalized = normalizeResumeText(text);
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const profile: ResumeProfileData = {};
  if (!hasUsefulResumeText(normalized)) {
    const fallbackName = deriveNameFromFileName(fileName);
    if (fallbackName.firstName) profile.firstName = fallbackName.firstName;
    if (fallbackName.lastName) profile.lastName = fallbackName.lastName;
  }

  const name = findName(lines);
  if (name.firstName) profile.firstName = name.firstName;
  if (name.lastName) profile.lastName = name.lastName;

  const email = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) profile.email = email;

  const phoneMatch = findPhone(normalized);
  if (phoneMatch) {
    const raw = phoneMatch.replace(/\s+/g, " ").trim();
    const codeMatch = raw.match(/^\+\d{1,3}/);
    if (codeMatch) {
      profile.countryCode = codeMatch[0];
      profile.phone = raw.slice(codeMatch[0].length).replace(/^[\s()-]+/, "").trim();
    } else {
      profile.phone = raw;
    }
  }

  const title = findProfessionalTitle(lines, profile);
  if (title) profile.professionalTitle = title;

  const location = findLocation(lines);
  if (location) {
    profile.currentLocation = location;
  }

  const summary = findSummary(normalized);
  if (summary) profile.summary = summary.slice(0, 600);

  const experience = findExperience(normalized);
  if (experience.years) profile.experienceYears = experience.years;
  if (experience.months) profile.experienceMonths = experience.months;

  // Pass through any explicit “Label: value” style fields that map directly
  // to the Basic Details form (DOB, gender, nationality, locations, etc.).
  const labeled = extractLabeledFields(lines);
  (Object.keys(labeled) as Array<keyof ResumeProfileData>).forEach((key) => {
    if (profile[key] == null || profile[key] === "") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profile as any)[key] = labeled[key];
    }
  });

  const education = findEducation(lines);
  if (education.length) profile.education = education;

  const certifications = findCertifications(lines);
  if (certifications.length) profile.certifications = certifications;

  const languages = findLanguages(lines);
  if (languages.length) profile.languages = languages;

  const externalLinks = findExternalLinks(normalized);
  if (externalLinks.length) profile.externalLinks = externalLinks;

  const keySkills = findKeySkills(normalized, lines);
  if (keySkills.length) profile.keySkills = keySkills;

  const tools = findTools(normalized, lines);
  if (tools.length) profile.tools = tools;

  const projects = findProjects(normalized);
  if (projects.length) profile.projects = projects;

  return profile;
}

function extractLabeledFields(lines: string[]): Partial<ResumeProfileData> {
  const result: Partial<ResumeProfileData> = {};

  for (const rawLine of lines) {
    if (!rawLine || rawLine.length < 4 || rawLine.length > 120) continue;

    const match = rawLine.match(/^([A-Za-z][A-Za-z\s/()&.-]{1,40})[:\-]\s*(.+)$/);
    if (!match) continue;

    const label = match[1].toLowerCase().trim();
    const value = match[2].trim();
    if (!value) continue;

    // Email
    if (label.includes("email")) {
      if (!result.email && /@/.test(value)) result.email = value;
      continue;
    }

    // Phone / mobile / contact
    if (label.includes("phone") || label.includes("mobile") || label.includes("contact") || label.includes("tel")) {
      const normalized = value.replace(/\s+/g, " ").trim();
      const phoneMatch = normalized.match(/(?:\+?\d[\d()\-\s]{6,}\d)/);
      if (phoneMatch) {
        const raw = phoneMatch[0].replace(/\s+/g, " ").trim();
        const codeMatch = raw.match(/^\+\d{1,3}/);
        if (codeMatch) {
          if (!result.countryCode) result.countryCode = codeMatch[0];
          if (!result.phone) {
            result.phone = raw.slice(codeMatch[0].length).replace(/^[\s()-]+/, "").trim();
          }
        } else if (!result.phone) {
          result.phone = raw;
        }
      }
      continue;
    }

    // Date of birth
    if (label.includes("dob") || label.includes("date of birth") || label.includes("birth date")) {
      if (!result.dob) result.dob = value;
      continue;
    }

    // Gender / sex
    if (label.includes("gender") || label.includes("sex")) {
      if (!result.gender) result.gender = value;
      continue;
    }

    // Nationality / citizenship
    if (label.includes("nationality") || label.includes("citizenship")) {
      if (!result.nationality) result.nationality = value;
      continue;
    }

    // Locations
    if (label.includes("location")) {
      if (label.includes("current") || label.includes("present")) {
        if (!result.currentLocation) result.currentLocation = value;
      } else if (label.includes("preferred") || label.includes("relocation") || label.includes("desired")) {
        if (!result.preferredLocation) result.preferredLocation = value;
      } else {
        if (!result.currentLocation) result.currentLocation = value;
      }
      continue;
    }

    // Total / overall experience expressed as a labeled field
    if (label.includes("experience")) {
      const exp = findExperience(value);
      if (exp.years && !result.experienceYears) result.experienceYears = exp.years;
      if (exp.months && !result.experienceMonths) result.experienceMonths = exp.months;
      continue;
    }

    // Salary (rough extraction; maps to generic salaryPerMonth / salaryCurrency fields)
    if (label.includes("salary") || label.includes("ctc") || label.includes("compensation")) {
      if (!result.salaryPerMonth) {
        const numeric = value.match(/[\d,.]+/);
        if (numeric) result.salaryPerMonth = numeric[0];
      }
      if (!result.salaryCurrency) {
        if (/₹|inr/i.test(value)) result.salaryCurrency = "INR";
        else if (/\$/i.test(value) || /\busd\b/i.test(value)) result.salaryCurrency = "USD";
        else if (/\beur\b/i.test(value)) result.salaryCurrency = "EUR";
      }
      continue;
    }
  }

  return result;
}

function normalizedTextForFiltering(text: string) {
  return normalizeResumeText(text);
}

function normalizeResumeText(text: string) {
  const cleaned = text
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const decoded = maybeDecodeCaesarCipher(cleaned);
  return decoded
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n {1,}/g, "\n")
    .trim();
}

function deriveNameFromFileName(fileName: string) {
  const base = fileName.replace(/\.[^/.]+$/, "");
  const ignoredTokens = new Set(["resume", "cv", "profile", "updated", "final", "draft", "new"]);
  const parts = base
    .split(/[\s_-]+/)
    .filter(Boolean)
    .filter((part) => /^[A-Za-z.'-]+$/.test(part))
    .filter((part) => !ignoredTokens.has(part.toLowerCase()));

  if (parts.length < 2) {
    return { firstName: undefined, lastName: undefined };
  }

  return {
    firstName: capitalize(parts[0]),
    lastName: capitalize(parts.slice(1).join(" ")),
  };
}

function findName(lines: string[]) {
  const ignoredTokens = new Set(["resume", "cv", "profile"]);
  for (const line of lines.slice(0, 6)) {
    if (line.length < 3 || line.length > 50) continue;
    if (/@|http|www\.|\d{5,}/i.test(line)) continue;
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 2 || parts.length > 4) continue;
    if (!parts.every((part) => /^[A-Za-z.'-]+$/.test(part))) continue;
    if (parts.some((part) => ignoredTokens.has(part.toLowerCase()))) continue;
    return {
      firstName: capitalize(parts[0]),
      lastName: capitalize(parts.slice(1).join(" ")),
    };
  }
  return { firstName: undefined, lastName: undefined };
}

function findProfessionalTitle(lines: string[], profile: ResumeProfileData) {
  for (const line of lines.slice(0, 10)) {
    if (!line || line.length > 80) continue;
    if (profile.firstName && line.toLowerCase().includes(profile.firstName.toLowerCase())) continue;
    if (/@|http|www\.|\d{5,}/i.test(line)) continue;
    if (/^(summary|profile|about|education|experience|skills)$/i.test(line)) continue;
    if (
      /[|]/.test(line) ||
      /\b(engineer|developer|designer|manager|analyst|consultant|architect|specialist|lead|intern|administrator|tester|programmer|executive)\b/i.test(line)
    ) {
      return line;
    }
  }

  for (const line of lines.slice(1, 6)) {
    if (!line || line.length < 4 || line.length > 60) continue;
    if (/@|http|www\.|\+?\d[\d()\-\s]{8,}/i.test(line)) continue;
    if (/^[A-Za-z][A-Za-z\s/&,-]+$/.test(line) && line.split(/\s+/).length <= 6) {
      return line;
    }
  }
  return undefined;
}

function findLocation(lines: string[]) {
  const blockedTerms = [
    "linkedin",
    "github",
    "portfolio",
    "summary",
    "profile",
    "experience",
    "education",
    "skills",
    "project",
    "certificate",
    "certification",
    "email",
    "phone",
  ];

  for (const line of lines.slice(0, 12)) {
    if (/@|http|www\.|\+?\d[\d()\-\s]{8,}/i.test(line)) continue;
    if (line.length < 4 || line.length > 60) continue;
    const lower = line.toLowerCase();
    if (blockedTerms.some((term) => lower.includes(term))) continue;
    if (/^[A-Za-z .'-]+,\s*[A-Za-z .'-]+$/.test(line)) return line;
  }
  return undefined;
}

function findSummary(text: string) {
  const section = extractSection(text, ["summary", "profile", "about", "professional summary", "objective"]);
  if (section) return section.replace(/\s+/g, " ").trim();

  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return paragraphs.find(
    (part) => part.length >= 80 && part.length <= 600 && !looksLikeContactBlock(part)
  );
}

function findExperience(text: string) {
  const match = text.match(
    /\b(\d{1,2})\+?\s*(?:years|yrs)(?:\s*(?:and|&)\s*(\d{1,2})\s*(?:months|mos))?/i
  );
  if (!match) return { years: undefined, months: undefined };

  return {
    years: match[1],
    months: match[2] ?? "0",
  };
}

function extractSection(text: string, headings: string[]) {
  const blocks = text.split(SECTION_BREAK);
  for (const block of blocks) {
    const [firstLine, ...rest] = block.split("\n");
    if (headings.some((heading) => firstLine.trim().toLowerCase() === heading)) {
      return rest.join(" ").trim();
    }
  }
  return undefined;
}

function findEducation(lines: string[]) {
  const entries: NonNullable<ResumeProfileData["education"]> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lower = ` ${line.toLowerCase()} `;
    if (!DEGREE_KEYWORDS.some((keyword) => lower.includes(keyword))) continue;
    entries.push({
      title: line,
      institute: lines[i + 1] && !looksLikeSectionHeader(lines[i + 1]) ? lines[i + 1] : undefined,
      graduationYear: line.match(/\b(19|20)\d{2}\b/)?.[0] ?? lines[i + 1]?.match(/\b(19|20)\d{2}\b/)?.[0],
    });
    if (entries.length >= 3) break;
  }
  return entries;
}

function findCertifications(lines: string[]) {
  const entries: NonNullable<ResumeProfileData["certifications"]> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (!CERTIFICATION_KEYWORDS.some((keyword) => lower.includes(keyword))) continue;
    if (looksLikeSectionHeader(line)) continue;
    entries.push({
      name: line,
      issuing: lines[i + 1] && !looksLikeSectionHeader(lines[i + 1]) ? lines[i + 1] : undefined,
    });
    if (entries.length >= 3) break;
  }
  return entries;
}

function findLanguages(lines: string[]) {
  const found = new Set<string>();
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const language of LANGUAGE_NAMES) {
      if (lower.includes(language)) found.add(capitalize(language));
    }
  }
  return Array.from(found).slice(0, 5).map((language) => ({
    language,
    read: "Professional",
    write: "Professional",
    speak: "Professional",
  }));
}

function findExternalLinks(text: string) {
  const matches = text.match(
    /(?:https?:\/\/|www\.|linkedin\.com\/[^\s)]+|github\.com\/[^\s)]+|gitlab\.com\/[^\s)]+|portfolio[^\s)]*)[^\s)]*/gi
  ) ?? [];
  const links: NonNullable<ResumeProfileData["externalLinks"]> = [];
  const seen = new Set<string>();

  for (const rawMatch of matches) {
    const url = rawMatch.replace(/[.,;]+$/, "");
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const lower = normalizedUrl.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    let label = "Website";
    if (lower.includes("linkedin")) label = "LinkedIn";
    else if (lower.includes("github")) label = "GitHub";
    else if (lower.includes("portfolio")) label = "Portfolio";

    links.push({ label, url: normalizedUrl });
    if (links.length >= 5) break;
  }

  return links;
}

function findKeySkills(text: string, lines: string[]) {
  const found = new Set<string>();
  const skillSection = extractSection(text, [
    "skills",
    "technical skills",
    "key skills",
    "core competencies",
    "technical proficiencies",
  ]);

  const source = [skillSection ?? "", ...lines.slice(0, 40)].join("\n").toLowerCase();
  for (const keyword of SKILL_KEYWORDS) {
    if (source.includes(keyword.toLowerCase())) {
      found.add(normalizeSkillLabel(keyword));
    }
  }

  return Array.from(found).slice(0, 20);
}

function findTools(text: string, lines: string[]) {
  const found = new Set<string>();
  const toolSection = extractSection(text, [
    "tools",
    "technologies",
    "technical skills",
    "software tools",
    "frameworks",
  ]);

  const source = [toolSection ?? "", ...lines.slice(0, 50)].join("\n").toLowerCase();
  for (const keyword of SKILL_KEYWORDS) {
    if (source.includes(keyword.toLowerCase())) {
      found.add(normalizeSkillLabel(keyword));
    }
  }

  return Array.from(found).slice(0, 12);
}

function findProjects(text: string) {
  const section = extractSection(text, [
    "projects",
    "project experience",
    "personal projects",
    "academic projects",
  ]);

  if (!section) return [];

  const chunks = section
    .split(/\n{2,}|(?:^|\n)(?:project\s*\d+[:\-]?\s*)/i)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter((chunk) => chunk.length >= 40);

  const projects: NonNullable<ResumeProfileData["projects"]> = [];

  for (const chunk of chunks.slice(0, 3)) {
    const sentences = chunk.split(/(?<=[.?!])\s+/).filter(Boolean);
    const titleCandidate = chunk.split(/[:|\n-]/)[0]?.trim();
    const title =
      titleCandidate &&
      titleCandidate.length >= 3 &&
      titleCandidate.length <= 60 &&
      !looksLikeContactBlock(titleCandidate) &&
      !looksLikeLocation(titleCandidate)
        ? titleCandidate
        : undefined;

    const description = sentences.slice(0, 2).join(" ").slice(0, 300).trim();
    const responsibilities = sentences.slice(2).join(" ").slice(0, 300).trim() || description;

    projects.push({
      projectTitle: title,
      projectDescription: description || undefined,
      responsibilities: responsibilities || undefined,
    });
  }

  return projects.filter((project) => project.projectDescription || project.responsibilities);
}

function hasUsefulResumeText(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < 80) return false;

  const letters = (cleaned.match(/[A-Za-z]/g) ?? []).length;
  const words = cleaned.split(/\s+/).filter((word) => /[A-Za-z]{2,}/.test(word));

  return letters >= 40 && words.length >= 10;
}

function findPhone(text: string) {
  const topText = text.split("\n").slice(0, 20).join("\n");
  const matches = topText.match(/(?:\+?\d[\d()\-\s]{8,}\d)/g) ?? text.match(/(?:\+?\d[\d()\-\s]{8,}\d)/g) ?? [];

  for (const match of matches) {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) continue;
    if (/^(19|20)\d{2}/.test(digits)) continue;
    return match;
  }

  return undefined;
}

function sanitizeResumeProfile(profile: ResumeProfileData, normalizedText = ""): ResumeProfileData {
  const cleaned: ResumeProfileData = {};

  cleaned.firstName = sanitizeNamePart(profile.firstName);
  cleaned.lastName = sanitizeLastName(profile.lastName);

  const title = sanitizeTitle(profile.professionalTitle, normalizedText);
  if (title) cleaned.professionalTitle = title;

  if (isValidEmail(profile.email)) cleaned.email = profile.email?.trim();
  if (isValidEmail(profile.altEmail)) cleaned.altEmail = profile.altEmail?.trim();

  const phone = sanitizePhone(profile.phone);
  if (phone) cleaned.phone = phone;
  if (cleaned.phone && profile.countryCode && /^\+\d{1,3}$/.test(profile.countryCode.trim())) {
    cleaned.countryCode = profile.countryCode.trim();
  }

  if (profile.summary && !looksLikeContactBlock(profile.summary)) {
    cleaned.summary = profile.summary.trim().slice(0, 600);
  }

  if (profile.experienceYears && /^\d{1,2}$/.test(profile.experienceYears)) {
    cleaned.experienceYears = profile.experienceYears;
  }
  if (profile.experienceMonths && /^\d{1,2}$/.test(profile.experienceMonths)) {
    cleaned.experienceMonths = profile.experienceMonths;
  }

  if (profile.currentLocation && looksLikeLocation(profile.currentLocation)) {
    cleaned.currentLocation = profile.currentLocation.trim();
  }
  if (profile.preferredLocation && looksLikeExplicitPreferredLocation(profile.preferredLocation, normalizedText)) {
    cleaned.preferredLocation = profile.preferredLocation.trim();
  }

  if (profile.education?.length) {
    cleaned.education = profile.education.filter((entry) => {
      const titleOk = !!entry.title && entry.title.trim().length >= 4 && !looksLikeSectionHeader(entry.title);
      const instituteOk = !entry.institute || entry.institute.trim().length >= 2;
      return titleOk && instituteOk;
    });
  }

  if (profile.certifications?.length) {
    cleaned.certifications = profile.certifications.filter((entry) => {
      const name = entry.name?.trim();
      return !!name && name.length >= 4 && !looksLikeSectionHeader(name);
    });
  }

  if (profile.languages?.length) {
    cleaned.languages = profile.languages.filter((entry) => !!entry.language && LANGUAGE_NAMES.includes(entry.language.toLowerCase()));
  }

  if (profile.externalLinks?.length) {
    const seen = new Set<string>();
    cleaned.externalLinks = profile.externalLinks.filter((entry) => {
      const url = entry.url?.trim();
      if (!url || !/^https?:\/\//i.test(url)) return false;
      const key = url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (profile.keySkills?.length) {
    cleaned.keySkills = Array.from(
      new Set(profile.keySkills.map((skill) => normalizeSkillLabel(skill)).filter(Boolean))
    ).slice(0, 20);
  }

  if (profile.tools?.length) {
    cleaned.tools = Array.from(
      new Set(profile.tools.map((tool) => normalizeSkillLabel(tool)).filter(Boolean))
    ).slice(0, 12);
  }

  if (profile.projects?.length) {
    cleaned.projects = profile.projects
      .map((project) => ({
        projectTitle: sanitizeProjectTitle(project.projectTitle),
        customerCompany: sanitizeCompany(project.customerCompany),
        projectDescription: sanitizeLongText(project.projectDescription, 300),
        responsibilities: sanitizeLongText(project.responsibilities, 300),
      }))
      .filter((project) => !!project.projectDescription || !!project.responsibilities);
  }

  return cleaned;
}

function sanitizeNamePart(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (!/^[A-Za-z.'-]+(?: [A-Za-z.'-]+)*$/.test(trimmed)) return undefined;
  if (/\b(resume|cv|profile|summary|developer|engineer)\b/i.test(trimmed)) return undefined;
  return capitalize(trimmed);
}

function sanitizeLastName(value?: string) {
  const cleaned = sanitizeNamePart(value);
  if (!cleaned) return undefined;
  if (cleaned.split(/\s+/).length > 3) return undefined;
  return cleaned;
}

function sanitizeTitle(value?: string, normalizedText = "") {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < 3 || trimmed.length > 60) return undefined;
  if (looksLikeContactBlock(trimmed)) return undefined;
  if (looksLikeLocation(trimmed)) return undefined;
  if (/\b(resume|cv|profile|summary|education|experience|skills)\b/i.test(trimmed)) return undefined;
  if (trimmed.split(/\s+/).length > 8) return undefined;
  if (/,/.test(trimmed) && !/\b(engineer|developer|designer|manager|analyst|consultant|architect|specialist|lead|intern|administrator|tester|programmer|executive)\b/i.test(trimmed)) {
    return undefined;
  }
  if (normalizedText && !hasTitleEvidence(trimmed, normalizedText)) return undefined;
  return trimmed;
}

function sanitizePhone(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return undefined;
  return trimmed;
}

function sanitizeProjectTitle(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < 3 || trimmed.length > 80) return undefined;
  if (looksLikeContactBlock(trimmed) || looksLikeLocation(trimmed)) return undefined;
  return trimmed;
}

function sanitizeCompany(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < 2 || trimmed.length > 80) return undefined;
  if (looksLikeContactBlock(trimmed)) return undefined;
  return trimmed;
}

function sanitizeLongText(value?: string, maxLength = 300) {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return undefined;
  if (trimmed.length < 20) return undefined;
  if (looksLikeContactBlock(trimmed)) return undefined;
  return trimmed.slice(0, maxLength);
}

function isValidEmail(value?: string) {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function looksLikeContactBlock(value: string) {
  return /@|https?:\/\/|www\.|linkedin|github|\+?\d[\d()\-\s]{8,}/i.test(value);
}

function looksLikeLocation(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 4 || trimmed.length > 60) return false;
  if (looksLikeContactBlock(trimmed)) return false;
  return /^[A-Za-z .'-]+,\s*[A-Za-z .'-]+$/.test(trimmed);
}

function looksLikeExplicitPreferredLocation(value: string, normalizedText: string) {
  if (!looksLikeLocation(value)) return false;
  if (!normalizedText) return false;
  const escaped = escapeRegExp(value.trim());
  return new RegExp(`preferred\\s+location\\s*[:\\-]?\\s*${escaped}`, "i").test(normalizedText);
}

function hasTitleEvidence(title: string, normalizedText: string) {
  const escaped = escapeRegExp(title);
  if (new RegExp(`\\b${escaped}\\b`, "i").test(normalizedText)) return true;
  return /\b(engineer|developer|designer|manager|analyst|consultant|architect|specialist|lead|intern|administrator|tester|programmer|executive)\b/i.test(title);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSkillLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const map: Record<string, string> = {
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "react": "React",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "mongodb": "MongoDB",
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "aws": "AWS",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "python": "Python",
    "java": "Java",
    "c#": "C#",
    ".net": ".NET",
    "angular": "Angular",
    "vue": "Vue",
    "html": "HTML",
    "css": "CSS",
    "tailwind": "Tailwind",
    "figma": "Figma",
    "git": "Git",
    "github": "GitHub",
    "gitlab": "GitLab",
    "jira": "Jira",
    "postman": "Postman",
    "redux": "Redux",
    "graphql": "GraphQL",
    "rest api": "REST API",
    "express": "Express",
  };

  return map[trimmed.toLowerCase()] ?? trimmed;
}

function looksLikeSectionHeader(line: string) {
  return /^[A-Z][A-Z\s/&,-]{2,}$/.test(line.trim());
}

function capitalize(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function maybeDecodeCaesarCipher(text: string) {
  const scoreEncrypted =
    countMatches(text.toLowerCase(), /\bwkh\b/g) +
    countMatches(text.toLowerCase(), /\wdqg\b/g) +
    countMatches(text.toLowerCase(), /\wiru\b/g) +
    countMatches(text.toLowerCase(), /\wzlwk\b/g);

  if (scoreEncrypted < 2) return text;

  const decoded = shiftLetters(text, -3);
  const scoreDecoded =
    countMatches(decoded.toLowerCase(), /\bthe\b/g) +
    countMatches(decoded.toLowerCase(), /\band\b/g) +
    countMatches(decoded.toLowerCase(), /\bfor\b/g) +
    countMatches(decoded.toLowerCase(), /\bwith\b/g);

  return scoreDecoded > scoreEncrypted ? decoded : text;
}

function shiftLetters(text: string, shift: number) {
  return Array.from(text)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCharCode((((code - 65 + shift) % 26) + 26) % 26 + 65);
      }
      if (code >= 97 && code <= 122) {
        return String.fromCharCode((((code - 97 + shift) % 26) + 26) % 26 + 97);
      }
      return char;
    })
    .join("");
}

function countMatches(text: string, regex: RegExp) {
  return text.match(regex)?.length ?? 0;
}

function extractTextFromDocx(buffer: Buffer) {
  const xmlParts: string[] = [];
  const entries = readZipEntries(buffer);
  entries.forEach((content, name) => {
    if (!/^word\/(document|header\d+|footer\d+)\.xml$/i.test(name)) return;
    xmlParts.push(content.toString("utf8"));
  });

  const joined = xmlParts.join("\n");
  return joined
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\/>/g, " ")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function readZipEntries(buffer: Buffer) {
  const entries = new Map<string, Buffer>();
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);

  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

    if (!fileName.endsWith("/")) {
      let content = compressed;
      if (compressionMethod === 8) {
        content = inflateRawSync(compressed);
      }
      entries.set(fileName, content);
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(buffer: Buffer) {
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("Invalid DOCX file.");
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Try custom extraction first (faster)
  const textChunks: string[] = [];
  const content = buffer.toString("latin1");
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(content)) !== null) {
    const rawStream = Buffer.from(match[1], "latin1");
    const decoded = decodePdfStream(rawStream);
    if (!decoded) continue;

    pushRegexMatches(decoded, /\(([^()]*)\)\s*Tj/g, textChunks);

    const arrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let arrayMatch: RegExpExecArray | null;
    while ((arrayMatch = arrayRegex.exec(decoded)) !== null) {
      pushRegexMatches(arrayMatch[1], /\(([^()]*)\)/g, textChunks);
    }
  }

  let extracted = textChunks
    .join("\n")
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ");

  console.log("📝 Custom PDF extraction result:", extracted.length, "characters");

  // If custom extraction failed, fall back to pdf-parse
  if (!hasUsefulResumeText(extracted)) {
    console.log("⚠️ Custom PDF extraction yielded little text, trying pdf-parse library...");
    try {
      const runtimeRequire = eval("require") as NodeRequire;
      const pdfParsePath = path.join(
        process.cwd(),
        "node_modules",
        "pdf-parse",
        "dist",
        "pdf-parse",
        "cjs",
        "index.cjs"
      );
      const { PDFParse } = runtimeRequire(pdfParsePath) as {
        PDFParse: new (options: { data: Buffer }) => {
          getText: () => Promise<{ text?: string }>;
          destroy: () => Promise<void>;
        };
      };
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      extracted = data.text ?? "";
      await parser.destroy();
      console.log("✅ pdf-parse extracted:", extracted.length, "characters");
    } catch (error) {
      console.error("❌ pdf-parse also failed:", error);
    }
  }

  return extracted;
}

function decodePdfStream(stream: Buffer) {
  const trimmed = trimPdfStream(stream);
  const candidates = [trimmed, trimPdfStream(inflateIfPossible(trimmed))].filter(Boolean) as Buffer[];

  for (const candidate of candidates) {
    const text = candidate.toString("latin1");
    if (/\bTj\b|\bTJ\b/.test(text)) return text;
  }

  return undefined;
}

function pushRegexMatches(source: string, regex: RegExp, output: string[]) {
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    output.push(match[1]);
  }
}

function inflateIfPossible(stream: Buffer) {
  try {
    return inflateSync(stream);
  } catch {
    return Buffer.alloc(0);
  }
}

function trimPdfStream(stream: Buffer) {
  let start = 0;
  let end = stream.length;
  while (start < end && (stream[start] === 0x0d || stream[start] === 0x0a)) start += 1;
  while (end > start && (stream[end - 1] === 0x0d || stream[end - 1] === 0x0a)) end -= 1;
  return stream.subarray(start, end);
}
