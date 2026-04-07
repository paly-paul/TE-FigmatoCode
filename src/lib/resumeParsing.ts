import { inflateRawSync, inflateSync } from "zlib";
import { ResumeProfileData } from "@/types/profile";

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
const COMMON_SECTION_HEADINGS = new Set(
  [
    "summary",
    "profile",
    "about",
    "professional summary",
    "career summary",
    "objective",
    "skills",
    "technical skills",
    "key skills",
    "core competencies",
    "technical proficiencies",
    "technologies",
    "tools",
    "software tools",
    "frameworks",
    "projects",
    "project experience",
    "personal projects",
    "academic projects",
    "work experience",
    "experience",
    "employment history",
    "professional experience",
    "education",
    "academic qualification",
    "academics",
    "certifications",
    "certification",
    "certificates",
    "courses",
    "internships",
    "internship",
    "languages",
    "contact",
  ].map((heading) => cleanHeadingToken(heading))
);

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
    throw new Error("Unsupported file type. Please upload a PDF or DOCX resume.");
  }

  console.log("📝 Total extracted text length:", text.length);
  console.log("📝 First 300 chars:", text.slice(0, 300));

  if (!hasUsefulResumeText(text)) {
    // Keep parsing with best-effort heuristics (e.g., filename fallback)
    // instead of failing hard for low-quality but still partially readable files.
    console.warn("⚠️ Low-confidence resume text extraction. Proceeding with best-effort parsing.");
  }

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
  if (title && !looksLikePersonName(title, profile.firstName, profile.lastName)) {
    profile.professionalTitle = title;
  }

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

  const workExperience = findWorkExperience(normalized);
  if (workExperience.length) profile.workExperience = workExperience;

  if (!profile.cgpa) {
    const cgpaMatch = normalized.match(/\b(?:cgpa|gpa)\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)\b/i);
    if (cgpaMatch?.[1]) profile.cgpa = cgpaMatch[1];
  }

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
  const ignoredTokens = new Set([
    "resume",
    "cv",
    "profile",
    "updated",
    "final",
    "draft",
    "new",
    "ats",
    "tb",
    "template",
  ]);
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
  const ignoredTokens = new Set(["resume", "cv", "profile", "ats", "tb", "template"]);
  for (const line of lines.slice(0, 6)) {
    if (line.length < 3 || line.length > 50) continue;
    if (/@|http|www\.|\d{5,}/i.test(line)) continue;
    const parts = line
      .split(/\s+/)
      .filter(Boolean)
      .filter((part) => !ignoredTokens.has(part.toLowerCase()));
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
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").toLowerCase();
  for (const line of lines.slice(0, 10)) {
    if (!line || line.length > 80) continue;
    const lower = line.toLowerCase();
    if (fullName && lower.includes(fullName)) continue;
    if (profile.firstName && line.toLowerCase().includes(profile.firstName.toLowerCase())) continue;
    if (profile.lastName && line.toLowerCase().includes(profile.lastName.toLowerCase())) continue;
    if (/@|http|www\.|\d{5,}/i.test(line)) continue;
    if (/^(summary|profile|about|education|experience|skills)$/i.test(line)) continue;
    if (/^[A-Z][A-Z\s.'-]{2,}$/.test(line) && !/\b(engineer|developer|designer|manager|analyst|consultant|architect|specialist|lead|intern|administrator|tester|programmer|executive)\b/i.test(line)) continue;
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

  // Fallback: infer likely role from experience section.
  const experienceLines = getSectionScopedLines(lines, [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "internship",
    "internships",
  ]);
  for (const line of experienceLines.slice(0, 20)) {
    if (!line || line.length < 3 || line.length > 80) continue;
    if (/@|http|www\.|\+?\d[\d()\-\s]{8,}/i.test(line)) continue;
    if (
      /\b(engineer|developer|designer|manager|analyst|consultant|architect|specialist|lead|intern|administrator|tester|programmer|executive)\b/i.test(
        line
      )
    ) {
      return line.replace(/^\d+\)\s*/, "").trim();
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
    /\b(\d{1,2})\+?\s*(?:years|yrs)(?:\s*(?:and|&|,)\s*(\d{1,2})\s*(?:months|mos))?/i
  );
  if (match) {
    return {
      years: match[1],
      months: match[2] ?? "0",
    };
  }

  const decimalMatch = text.match(/\b(\d{1,2})(?:\.(\d))?\+?\s*(?:years|yrs)\b/i);
  if (!decimalMatch) return { years: undefined, months: undefined };

  const years = decimalMatch[1];
  const decimal = decimalMatch[2] ? parseInt(decimalMatch[2], 10) : 0;
  const months = decimal ? String(Math.min(11, Math.round((decimal / 10) * 12))) : "0";
  return { years, months };
}

function extractSection(text: string, headings: string[]) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => Boolean(line) || (index > 0 && index < all.length - 1));
  const normalizedHeadings = new Set(headings.map((heading) => cleanHeadingToken(heading)));

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const normalizedLine = cleanHeadingToken(line);
    if (!normalizedHeadings.has(normalizedLine)) continue;

    const sectionLines: string[] = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (!next) {
        if (sectionLines.length) sectionLines.push("");
        continue;
      }
      if (isResumeSectionHeading(next) && !normalizedHeadings.has(cleanHeadingToken(next))) {
        break;
      }
      sectionLines.push(next);
    }

    const joined = sectionLines.join("\n").trim();
    if (joined) {
      return joined;
    }
  }
  return undefined;
}

function findEducation(lines: string[]) {
  const entries: NonNullable<ResumeProfileData["education"]> = [];
  const sourceLines = getSectionScopedLines(lines, [
    "education",
    "academic",
    "academic details",
    "academic background",
    "qualification",
    "qualifications",
  ]);

  const linesToScan = sourceLines.length ? sourceLines : lines;
  for (let i = 0; i < linesToScan.length; i += 1) {
    const line = linesToScan[i];
    const lower = ` ${line.toLowerCase()} `;
    if (!DEGREE_KEYWORDS.some((keyword) => lower.includes(keyword))) continue;
    if (looksLikeContactBlock(line) || /https?:\/\//i.test(line)) continue;

    const parsedInline = parseInlineEducation(line);
    const nextLine = linesToScan[i + 1];
    const nextNextLine = linesToScan[i + 2];
    const fallbackInstitute =
      nextLine &&
      !looksLikeSectionHeader(nextLine) &&
      !looksLikeContactBlock(nextLine) &&
      !isResumeSectionHeading(nextLine) &&
      looksLikeInstituteText(nextLine)
        ? nextLine
        : nextNextLine &&
            !looksLikeSectionHeader(nextNextLine) &&
            !looksLikeContactBlock(nextNextLine) &&
            !isResumeSectionHeading(nextNextLine) &&
            looksLikeInstituteText(nextNextLine)
          ? nextNextLine
          : undefined;
    const fallbackSpecialization =
      nextLine &&
      !looksLikeSectionHeader(nextLine) &&
      !looksLikeContactBlock(nextLine) &&
      !isResumeSectionHeading(nextLine) &&
      !looksLikeInstituteText(nextLine) &&
      looksLikeSpecializationText(nextLine)
        ? nextLine
        : undefined;
    const yearRangeMatch =
      line.match(/(19|20)\d{2}\s*[–-]\s*((?:19|20)\d{2})/) ??
      nextLine?.match(/(19|20)\d{2}\s*[–-]\s*((?:19|20)\d{2})/) ??
      nextNextLine?.match(/(19|20)\d{2}\s*[–-]\s*((?:19|20)\d{2})/);
    const cgpaMatch =
      line.match(/\b(?:cgpa|gpa)\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)\b/i) ??
      nextLine?.match(/\b(?:cgpa|gpa)\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)\b/i) ??
      nextNextLine?.match(/\b(?:cgpa|gpa)\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)\b/i);

    entries.push({
      title: parsedInline.title ?? line,
      institute: parsedInline.institute ?? fallbackInstitute,
      specialization: parsedInline.specialization ?? fallbackSpecialization,
      graduationYear:
        yearRangeMatch?.[2] ??
        parsedInline.graduationYear ??
        line.match(/\b(19|20)\d{2}\b/)?.[0] ??
        nextLine?.match(/\b(19|20)\d{2}\b/)?.[0] ??
        nextNextLine?.match(/\b(19|20)\d{2}\b/)?.[0],
      score: cgpaMatch?.[1],
    });
    if (entries.length >= 5) break;
  }
  return entries;
}

function findCertifications(lines: string[]) {
  const entries: NonNullable<ResumeProfileData["certifications"]> = [];
  const sourceLines = getSectionScopedLines(lines, [
    "certifications",
    "certification",
    "licenses",
    "credentials",
  ]);

  const linesToScan = sourceLines.length ? sourceLines : lines;
  for (let i = 0; i < linesToScan.length; i += 1) {
    const line = linesToScan[i];
    const lower = line.toLowerCase();
    if (/^\d{4}:?\s*$/.test(line)) continue;
    if (looksLikeSectionHeader(line)) continue;
    if (looksLikeContactBlock(line) || /https?:\/\//i.test(line)) continue;
    if (line.length < 10 || line.length > 200) continue;
    if (
      !CERTIFICATION_KEYWORDS.some((keyword) => lower.includes(keyword)) &&
      !/\b(udemy|coursera|cisco|aws|google|microsoft|oracle|nptel|infosys|certificate)\b/i.test(line)
    ) {
      continue;
    }

    const parsedInline = parseInlineCertification(line);
    const nextLine = linesToScan[i + 1];
    const fallbackIssuer =
      nextLine &&
      !looksLikeSectionHeader(nextLine) &&
      !looksLikeContactBlock(nextLine) &&
      !isResumeSectionHeading(nextLine)
        ? nextLine
        : undefined;

    entries.push({
      name: parsedInline.name ?? line,
      issuing: parsedInline.issuing ?? fallbackIssuer,
    });
    if (entries.length >= 20) break;
  }
  return entries;
}

function findWorkExperience(text: string) {
  const section = extractSection(text, [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
  ]);

  if (!section) return [];

  const experiences: NonNullable<ResumeProfileData["workExperience"]> = [];
  const positionRegex = /\d+\)\s*([^\n]+)\n([^\n|]+)(?:\s*\|\s*([^\n]+))?/g;
  let match: RegExpExecArray | null;

  while ((match = positionRegex.exec(section)) !== null) {
    experiences.push({
      jobTitle: match[1]?.trim() || undefined,
      company: match[2]?.trim() || undefined,
      duration: match[3]?.trim() || undefined,
    });
    if (experiences.length >= 12) break;
  }

  return experiences;
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

  if (skillSection) {
    for (const candidate of extractSkillCandidates(skillSection)) {
      found.add(candidate);
    }
  }

  if (!skillSection) {
    const keywordLines = lines
      .filter((line) => /\b(skills?|technical|technologies|competencies|proficiencies)\b/i.test(line))
      .slice(0, 12);
    for (const line of keywordLines) {
      for (const candidate of extractSkillCandidates(line)) {
        found.add(candidate);
      }
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

  if (toolSection) {
    for (const candidate of extractSkillCandidates(toolSection)) {
      found.add(candidate);
    }
  }

  if (!toolSection) {
    const keywordLines = lines
      .filter((line) => /\b(tools?|platforms?|frameworks?|software|technologies)\b/i.test(line))
      .slice(0, 12);
    for (const line of keywordLines) {
      for (const candidate of extractSkillCandidates(line)) {
        found.add(candidate);
      }
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

  const chunks = splitProjectChunks(section);

  const projects: NonNullable<ResumeProfileData["projects"]> = [];

  for (const chunk of chunks.slice(0, 3)) {
    const normalizedChunk = chunk.replace(/\s+/g, " ").trim();
    const sentences = normalizedChunk.split(/(?<=[.?!])\s+/).filter(Boolean);
    const titleCandidate = chunk.split("\n")[0]?.trim();
    const title =
      titleCandidate &&
      titleCandidate.length >= 3 &&
      titleCandidate.length <= 80 &&
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
  if (title && !looksLikePersonName(title, cleaned.firstName ?? profile.firstName, cleaned.lastName ?? profile.lastName)) {
    cleaned.professionalTitle = title;
  }

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
      const title = entry.title?.trim();
      const institute = entry.institute?.trim();
      const specialization = entry.specialization?.trim();
      const year = entry.graduationYear?.trim();

      const shortDegreeOk = !!title && /\b(B\.?\s?E\.?|M\.?\s?E\.?|BCA|MCA|MBA|PHD)\b/i.test(title);
      const titleOk = !!title && (title.length >= 3 || shortDegreeOk) && !looksLikeSectionHeader(title);
      const instituteOk = !institute || institute.length >= 2;
      const hasAnyMeaningfulField = Boolean(title || institute || specialization || year);

      return hasAnyMeaningfulField && instituteOk && (titleOk || Boolean(institute));
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

  if (profile.workExperience?.length) {
    cleaned.workExperience = profile.workExperience
      .map((entry) => ({
        jobTitle: entry.jobTitle?.trim() || undefined,
        company: entry.company?.trim() || undefined,
        duration: entry.duration?.trim() || undefined,
        responsibilities: entry.responsibilities?.map((item) => item.trim()).filter(Boolean),
      }))
      .filter((entry) => entry.jobTitle || entry.company || entry.duration);
  }

  if (profile.cgpa && /^\d+(?:\.\d{1,2})?$/.test(profile.cgpa.trim())) {
    cleaned.cgpa = profile.cgpa.trim();
  }

  return cleaned;
}

function sanitizeNamePart(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (!/^[A-Za-z.'-]+(?: [A-Za-z.'-]+)*$/.test(trimmed)) return undefined;
  if (/\b(resume|cv|profile|summary|developer|engineer|ats|template)\b/i.test(trimmed)) return undefined;
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

function looksLikePersonName(value: string, firstName?: string, lastName?: string) {
  const candidate = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!candidate) return false;

  const first = firstName?.trim().toLowerCase();
  const last = lastName?.trim().toLowerCase();
  const full = [first, last].filter(Boolean).join(" ").trim();

  if (full && candidate === full) return true;
  if (first && !last && candidate === first) return true;
  if (last && !first && candidate === last) return true;

  const candidateTokens = candidate.split(/\s+/).filter(Boolean);
  const nameTokens = [first, ...(last ? last.split(/\s+/) : [])]
    .map((token) => token?.trim())
    .filter((token): token is string => Boolean(token));

  if (!candidateTokens.length || !nameTokens.length) return false;
  const overlap = candidateTokens.filter((token) => nameTokens.includes(token)).length;

  // If most of the candidate line is name tokens, it's likely the person's name.
  return overlap >= Math.min(candidateTokens.length, 2);
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

function cleanHeadingToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[:|-]+$/g, "")
    .replace(/[^\w\s/&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isResumeSectionHeading(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (looksLikeSectionHeader(trimmed)) return true;

  const normalized = cleanHeadingToken(trimmed);
  if (COMMON_SECTION_HEADINGS.has(normalized)) return true;

  if (/:$/.test(trimmed) && COMMON_SECTION_HEADINGS.has(normalized)) return true;

  const words = normalized.split(" ").filter(Boolean);
  if (words.length >= 1 && words.length <= 4 && COMMON_SECTION_HEADINGS.has(words.join(" "))) {
    return true;
  }

  return false;
}

function extractSkillCandidates(section: string) {
  const blockedHeadingTokens = new Set([
    "skills",
    "technical skills",
    "key skills",
    "tools",
    "technologies",
    "frameworks",
    "core competencies",
    "technical proficiencies",
  ]);

  const tokens = section
    .split(/\n|,|•|\||\/{2,}|;|·|:/g)
    .map((token) => token.replace(/^[-*]\s*/, "").trim())
    .map((token) => token.replace(/^[A-Za-z][A-Za-z\s/&.-]{1,30}:\s*/, "").trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      tokens
        .filter((token) => token.length >= 2 && token.length <= 40)
        .filter((token) => !/\d{4}/.test(token))
        .filter((token) => !/@|https?:\/\/|www\./i.test(token))
        .filter((token) => token.split(/\s+/).length <= 4)
        .filter((token) => !blockedHeadingTokens.has(cleanHeadingToken(token)))
        .map((token) => normalizeSkillLabel(token))
        .filter(Boolean)
    )
  ).slice(0, 20);
}

function splitProjectChunks(section: string) {
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const chunks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    const value = current.join("\n").trim();
    if (value.length >= 30) chunks.push(value);
    current = [];
  };

  for (const line of lines) {
    const startsNewProject =
      current.length > 0 &&
      line.length >= 3 &&
      line.length <= 80 &&
      !/[.?!]$/.test(line) &&
      line.split(/\s+/).length <= 10 &&
      !/^[-*]/.test(line) &&
      !/^(responsibilities?|description|role|tech stack|team size)\b/i.test(line);

    if (startsNewProject) {
      flush();
    }

    current.push(line.replace(/^[-*]\s*/, ""));
  }

  flush();

  return chunks.length
    ? chunks
    : [
        section
          .replace(/\s+/g, " ")
          .trim(),
      ];
}

function getSectionScopedLines(lines: string[], headings: string[]) {
  const text = lines.join("\n");
  const section = extractSection(text, headings);
  if (!section) {
    // Fallback: detect heading line directly and capture until next heading.
    const normalizedHeadings = headings.map((heading) => cleanHeadingToken(heading));
    const start = lines.findIndex((line) => {
      const normalized = cleanHeadingToken(line);
      return normalizedHeadings.some(
        (heading) =>
          normalized === heading ||
          normalized.startsWith(`${heading} `) ||
          normalized.includes(heading)
      );
    });

    if (start < 0) return [];

    const scoped: string[] = [];
    for (let i = start + 1; i < lines.length; i += 1) {
      const next = lines[i]?.trim();
      if (!next) continue;
      if (isResumeSectionHeading(next)) break;
      scoped.push(next);
      if (scoped.length >= 80) break;
    }
    return scoped;
  }
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseInlineEducation(line: string) {
  const parts = line
    .split(/\s[|\-]\s|\s•\s|,/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const splitDegree = splitDegreeAndSpecialization(line);
  if (parts.length < 2) {
    return {
      title: splitDegree.title,
      specialization: splitDegree.specialization,
      institute: undefined,
      graduationYear: undefined,
    };
  }

  const title = splitDegree.title ?? parts.find((part) => DEGREE_KEYWORDS.some((k) => ` ${part.toLowerCase()} `.includes(k)));
  const specialization =
    splitDegree.specialization ??
    parts.find(
      (part) =>
        part !== title &&
        !looksLikeInstituteText(part) &&
        looksLikeSpecializationText(part)
    );
  const institute = parts.find(
    (part) =>
      !part.includes("@") &&
      !/https?:\/\//i.test(part) &&
      !/\b(19|20)\d{2}\b/.test(part) &&
      part !== title &&
      looksLikeInstituteText(part)
  );
  const fallbackInstitute = parts.find(
    (part) =>
      part !== title &&
      part !== specialization &&
      !part.includes("@") &&
      !/https?:\/\//i.test(part) &&
      !/\b(19|20)\d{2}\b/.test(part) &&
      part.split(/\s+/).length >= 2
  );
  const yearRange = line.match(/(19|20)\d{2}\s*[–-]\s*((?:19|20)\d{2})/);
  const graduationYear = yearRange?.[2] ?? line.match(/\b(19|20)\d{2}\b/)?.[0];
  return { title, specialization, institute: institute ?? fallbackInstitute, graduationYear };
}

function parseInlineCertification(line: string) {
  const issuerMatch = line.match(/[–-]\s*([^(]+)\s*\(/) || line.match(/\(([^)]+)\)/);
  const name = line
    .split(/\s*[–-]\s*|ELITE/i)[0]
    ?.trim()
    .replace(/\s{2,}/g, " ");
  const issuing = issuerMatch?.[1]?.trim();
  return { name: name || undefined, issuing: issuing || undefined };
}

function splitDegreeAndSpecialization(line: string) {
  const degreeMatch = line.match(
    /\b(B\.?\s?E\.?|B\.?\s?TECH|BACHELOR(?:'S)?|M\.?\s?E\.?|M\.?\s?TECH|MASTER(?:'S)?|MBA|MCA|BCA|DIPLOMA|PHD)\b\.?\s*(?:in)?\s*(.*)/i
  );
  if (!degreeMatch) return { title: undefined, specialization: undefined };

  const degreeToken = degreeMatch[1]?.replace(/\s+/g, " ").trim();
  const remainder = degreeMatch[2]?.trim();
  const title = degreeToken || undefined;
  const specialization =
    remainder &&
    !/\b(19|20)\d{2}\b/.test(remainder) &&
    !looksLikeInstituteText(remainder) &&
    remainder.length >= 3
      ? remainder
      : undefined;

  return { title, specialization };
}

function looksLikeInstituteText(value: string) {
  return /\b(college|university|institute|school|polytechnic|academy|campus)\b/i.test(value);
}

function looksLikeSpecializationText(value: string) {
  return /\b(engineering|electronics|electrical|computer|science|technology|mechanical|civil|information|communication|network|systems)\b/i.test(value);
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

function scoreExtractedResumeText(text: string) {
  if (!text) return 0;

  const normalized = normalizeResumeText(text);
  const lengthScore = Math.min(40, Math.floor(normalized.length / 50));
  const headingScore = countMatches(
    normalized.toLowerCase(),
    /\b(summary|profile|experience|work experience|education|skills|certifications|projects|languages)\b/g
  ) * 4;
  const contactScore =
    (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(normalized) ? 8 : 0) +
    (/(?:\+?\d[\d()\-\s]{8,}\d)/.test(normalized) ? 8 : 0);
  const lineStructureScore = Math.min(
    20,
    normalized.split("\n").filter((line) => line.trim().length >= 3).length / 4
  );
  const usefulBonus = hasUsefulResumeText(normalized) ? 15 : 0;

  return lengthScore + headingScore + contactScore + lineStructureScore + usefulBonus;
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

  // Also try pdf-parse and choose the better quality extraction.
  let extractedByLibrary = "";
  try {
    type PdfParseCtor = new (options: { data: Buffer | Uint8Array }) => {
      getText: () => Promise<{ text?: string }>;
      destroy: () => Promise<void>;
    };
    type PdfParseNodeModule = {
      PDFParse?: PdfParseCtor;
      default?: PdfParseCtor | { PDFParse?: PdfParseCtor };
    };

    // Prefer Node-targeted export in server runtime environments.
    const pdfParseMod = (await import("pdf-parse/node")) as PdfParseNodeModule;
    const PDFParseCtor =
      pdfParseMod.PDFParse ??
      (typeof pdfParseMod.default === "function" ? pdfParseMod.default : pdfParseMod.default?.PDFParse);
    if (!PDFParseCtor) throw new Error("pdf-parse export not found");

    const parser = new PDFParseCtor({ data: buffer });
    const data = await parser.getText();
    extractedByLibrary = data.text ?? "";
    await parser.destroy();
    console.log("✅ pdf-parse extracted:", extractedByLibrary.length, "characters");
  } catch (error) {
    console.error("❌ pdf-parse failed:", error);
  }

  const customScore = scoreExtractedResumeText(extracted);
  const libraryScore = scoreExtractedResumeText(extractedByLibrary);
  const selected = libraryScore > customScore ? extractedByLibrary : extracted;

  // Do not throw here; return best effort so callers can still extract partial
  // profile data and filename-derived identity when PDF text is weak.
  if (!selected.trim()) {
    console.warn("⚠️ PDF extraction produced no text.");
  }

  console.log("📊 PDF extraction quality scores:", {
    customScore,
    libraryScore,
    selected: libraryScore > customScore ? "pdf-parse" : "custom",
  });

  return selected;
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
