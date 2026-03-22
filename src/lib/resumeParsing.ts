import { inflateRawSync, inflateSync } from "zlib";
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

export async function parseResumeFile(file: File): Promise<ResumeProfileData> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  let text = "";
  if (lowerName.endsWith(".docx")) {
    text = extractTextFromDocx(buffer);
  } else if (lowerName.endsWith(".pdf")) {
    text = extractTextFromPdf(buffer);
  }

  return buildProfileFromText(text, file.name);
}

function buildProfileFromText(text: string, fileName: string): ResumeProfileData {
  const normalized = normalizeResumeText(text);
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const profile: ResumeProfileData = {};
  const fallbackName = deriveNameFromFileName(fileName);
  if (fallbackName.firstName) profile.firstName = fallbackName.firstName;
  if (fallbackName.lastName) profile.lastName = fallbackName.lastName;

  const name = findName(lines);
  if (name.firstName) profile.firstName = name.firstName;
  if (name.lastName) profile.lastName = name.lastName;

  const email = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) profile.email = email;

  const phoneMatch = normalized.match(/(?:\+?\d[\d()\-\s]{8,}\d)/);
  if (phoneMatch) {
    const phone = phoneMatch[0].replace(/\s+/g, " ").trim();
    profile.phone = phone.replace(/^\+\d{1,3}\s*/, "").trim();
    const codeMatch = phone.match(/^\+\d{1,3}/);
    if (codeMatch) profile.countryCode = codeMatch[0];
  }

  const title = findProfessionalTitle(lines, profile);
  if (title) profile.professionalTitle = title;

  const location = findLocation(lines);
  if (location) {
    profile.currentLocation = location;
    profile.preferredLocation = location;
  }

  const summary = findSummary(normalized);
  if (summary) profile.summary = summary.slice(0, 600);

  const education = findEducation(lines);
  if (education.length) profile.education = education;

  const certifications = findCertifications(lines);
  if (certifications.length) profile.certifications = certifications;

  const languages = findLanguages(lines);
  if (languages.length) profile.languages = languages;

  return profile;
}

function normalizeResumeText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function deriveNameFromFileName(fileName: string) {
  const base = fileName.replace(/\.[^/.]+$/, "");
  const parts = base.split(/[\s_-]+/).filter(Boolean);
  return {
    firstName: parts[0],
    lastName: parts[1],
  };
}

function findName(lines: string[]) {
  for (const line of lines.slice(0, 6)) {
    if (line.length < 3 || line.length > 50) continue;
    if (/@|http|www\.|\d{5,}/i.test(line)) continue;
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 2 || parts.length > 4) continue;
    if (!parts.every((part) => /^[A-Za-z.'-]+$/.test(part))) continue;
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
    if (/[|]/.test(line) || /\b(engineer|developer|designer|manager|analyst|consultant|architect|specialist)\b/i.test(line)) {
      return line;
    }
  }
  return undefined;
}

function findLocation(lines: string[]) {
  for (const line of lines.slice(0, 12)) {
    if (/@|http|www\.|\+?\d[\d()\-\s]{8,}/i.test(line)) continue;
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

  return paragraphs.find((part) => part.length >= 80 && part.length <= 600);
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

function looksLikeSectionHeader(line: string) {
  return /^[A-Z][A-Z\s/&,-]{2,}$/.test(line.trim());
}

function capitalize(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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

function extractTextFromPdf(buffer: Buffer) {
  const textChunks: string[] = [];
  const content = buffer.toString("latin1");
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(content)) !== null) {
    const rawStream = Buffer.from(match[1], "latin1");
    const decoded = decodePdfStream(rawStream);
    if (!decoded) continue;

    pushRegexMatches(decoded, /\(([^()]*)\)\s*Tj/g, textChunks);

    // Use [\s\S] instead of . with /s so ES2017 targets accept the pattern (dotAll is ES2018+).
    const arrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let arrayMatch: RegExpExecArray | null;
    while ((arrayMatch = arrayRegex.exec(decoded)) !== null) {
      pushRegexMatches(arrayMatch[1], /\(([^()]*)\)/g, textChunks);
    }
  }

  return textChunks
    .join("\n")
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ");
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
