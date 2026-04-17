"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppNavbar from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { Button } from "@/components/ui/Button";
import { BaseDrawer } from "@/components/ui/BaseDrawer";
import { SmallUploadIcon, TrashIcon } from "@/components/icons";
import { upsertResumeProfile, readResumeProfile } from "@/lib/profileSession";
import { getCandidateId, getProfileName, isLikelyDocId, setProfileName } from "@/lib/authSession";
import { MOBILE_MQ } from "@/lib/mobileViewport";
import { getCandidateProfileData } from "@/services/profile";
import { ResumeProfileData } from "@/types/profile";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nationalityOptions = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Others",
];
const languageRatings = [
  "Native / Bilingual",
  "Fluent",
  "Professional",
  "Intermediate",
  "Basic",
];
const languageOptions = ["English", "Spanish", "French", "Hindi", "Portuguese", "Other"];
const supportedCountryCodes = ["+1", "+91", "+44"];

interface EducationEntry {
  id: string;
  title: string;
  institute: string;
  specialization: string;
  graduationYear: string;
  score: string;
}

interface CertificationEntry {
  id: string;
  name: string;
  issuing: string;
  certificateNumber: string;
  issueDate: string;
  expirationDate: string;
  url: string;
}

interface ExternalLinkEntry {
  id: string;
  label: string;
  url: string;
}

interface LanguageEntry {
  id: string;
  language: string;
  read: string;
  write: string;
  speak: string;
}

function createEntryId(prefix = "entry") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

function createEducationEntry(overrides: Partial<Omit<EducationEntry, "id">> & { id?: string } = {}): EducationEntry {
  return {
    id: overrides.id ?? createEntryId("edu"),
    title: overrides.title ?? "",
    institute: overrides.institute ?? "",
    specialization: overrides.specialization ?? "",
    graduationYear: overrides.graduationYear ?? "",
    score: overrides.score ?? "",
  };
}

function createCertificationEntry(
  overrides: Partial<Omit<CertificationEntry, "id">> & { id?: string } = {}
): CertificationEntry {
  return {
    id: overrides.id ?? createEntryId("cert"),
    name: overrides.name ?? "",
    issuing: overrides.issuing ?? "",
    certificateNumber: overrides.certificateNumber ?? "",
    issueDate: overrides.issueDate ?? "",
    expirationDate: overrides.expirationDate ?? "",
    url: overrides.url ?? "",
  };
}

function createExternalLinkEntry(
  overrides: Partial<Omit<ExternalLinkEntry, "id">> & { id?: string } = {}
): ExternalLinkEntry {
  return {
    id: overrides.id ?? createEntryId("link"),
    label: overrides.label ?? "",
    url: overrides.url ?? "",
  };
}

function createLanguageEntry(
  overrides: Partial<Omit<LanguageEntry, "id">> & { id?: string } = {}
): LanguageEntry {
  return {
    id: overrides.id ?? createEntryId("lang"),
    language: overrides.language ?? "",
    read: overrides.read ?? "",
    write: overrides.write ?? "",
    speak: overrides.speak ?? "",
  };
}

interface BasicDetailsForm {
  professionalTitle: string;
  expYears: string;
  expMonths: string;
  salary: string;
  salaryCurrency: string;
  summary: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  countryCode: string;
  contact: string;
  email: string;
  altEmail: string;
  nationality: string;
  currentLocation: string;
  preferredLocation: string;
}

type FormErrors = Partial<Record<keyof BasicDetailsForm, string>>;

function normalizeExperienceYears(value: string | undefined): string {
  if (value == null || value === "") return "";
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n) || n < 1) return "";
  return String(Math.min(16, n));
}

function normalizeExperienceMonths(value: string | undefined): string {
  if (value == null || value === "") return "";
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n)) return "";
  return String(Math.min(11, Math.max(0, n)));
}

function normalizeGender(value: string | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "";
  if (["m", "male", "man"].includes(normalized)) return "Male";
  if (["f", "female", "woman"].includes(normalized)) return "Female";
  if (["other", "others", "non-binary", "non binary"].includes(normalized)) return "Other";
  return value?.trim() ?? "";
}

function normalizeCountryCode(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  const match = trimmed.match(/^\+\d{1,4}/);
  return match?.[0] ?? trimmed;
}

function normalizeDateForInput(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }

  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3].length === 2 ? `19${dmy[3]}` : dmy[3];
    return `${year}-${month}-${day}`;
  }

  const monthName = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthName) {
    const parsed = new Date(`${monthName[1]} ${monthName[2]}, ${monthName[3]}`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return "";
}

function withCurrentOption(options: string[], currentValue: string) {
  const value = currentValue.trim();
  return value && !options.includes(value) ? [value, ...options] : options;
}

function hasMeaningfulProfileValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

function mergeProfilePreferringExisting(existing: ResumeProfileData, incoming: ResumeProfileData): ResumeProfileData {
  const merged: ResumeProfileData = { ...incoming };
  for (const [key, value] of Object.entries(existing)) {
    if (hasMeaningfulProfileValue(value)) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

function preferExistingFormValue(existing: string, incoming: string): string {
  const left = (existing || "").trim();
  if (left) return existing;
  return incoming;
}

const initialForm: BasicDetailsForm = {
  professionalTitle: "",
  expYears: "",
  expMonths: "",
  salary: "",
  salaryCurrency: "",
  summary: "",
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  countryCode: "",
  contact: "",
  email: "",
  altEmail: "",
  nationality: "",
  currentLocation: "",
  preferredLocation: "",
};

const fieldClass = (hasError: boolean) =>
  `w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 ${
    hasError ? "border-red-400" : "border-gray-300"
  }`;

function buildGeneratedSummary(
  form: BasicDetailsForm,
  prompt: string,
  profile: ResumeProfileData = {}
) {
  return buildGeneratedSummaryFromProfile(form, prompt, profile);
}

function cleanPhrase(value: string | undefined | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function sentenceCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dedupeStrings(values: Array<string | undefined | null>) {
  return Array.from(
    new Set(
      values
        .map((value) => cleanPhrase(value))
        .filter(Boolean)
    )
  );
}

function formatList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function stripTrailingPeriod(value: string) {
  return value.replace(/\.+$/, "").trim();
}

function trimToSentenceBoundary(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const sliced = normalized.slice(0, maxLength);
  const lastBoundary = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("; "),
    sliced.lastIndexOf(", ")
  );

  if (lastBoundary > 120) {
    return sliced.slice(0, lastBoundary).trim().replace(/[;,]$/, "");
  }

  return sliced.trim().replace(/[;,]$/, "");
}

function extractPromptFocus(prompt: string) {
  const cleaned = cleanPhrase(prompt)
    .replace(/^generate\s+(me\s+)?/i, "")
    .replace(/^create\s+(me\s+)?/i, "")
    .replace(/^write\s+(me\s+)?/i, "")
    .replace(/^a\s+professional\s+summary\s+/i, "")
    .replace(/^professional\s+summary\s+/i, "")
    .replace(/^summary\s+/i, "")
    .replace(/^for\s+/i, "")
    .replace(/^an?\s+/i, "");

  return stripTrailingPeriod(cleaned);
}

function looksLikeResumeNoise(value: string) {
  const normalized = value.toLowerCase();
  return (
    /^languages?\s*:/i.test(value) ||
    /^certifications?\s*:/i.test(value) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(value) ||
    /\b\d{4}\b/.test(value) ||
    /\bintern\b/i.test(value) ||
    value.length > 140
  );
}

function isRelevantSkillForPrompt(skill: string, promptFocus: string, title: string) {
  const normalizedSkill = skill.toLowerCase();
  const normalizedPrompt = promptFocus.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  if (!normalizedPrompt) return true;
  if (normalizedPrompt.includes("backend")) {
    return /(api|node|java|python|sql|spring|backend|server|database|microservice|aws|docker|kubernetes)/i.test(normalizedSkill);
  }
  if (normalizedPrompt.includes("frontend")) {
    return /(react|javascript|typescript|html|css|ui|frontend|angular|vue)/i.test(normalizedSkill);
  }
  if (normalizedPrompt.includes("mobile")) {
    return /(flutter|dart|android|ios|react native|mobile)/i.test(normalizedSkill);
  }
  if (normalizedPrompt.includes("devops")) {
    return /(aws|docker|kubernetes|ci\/cd|terraform|devops|linux)/i.test(normalizedSkill);
  }

  return normalizedPrompt.includes(normalizedSkill) || normalizedTitle.includes(normalizedSkill);
}

function pickProjectHighlight(projects: ResumeProfileData["projects"], promptFocus: string) {
  if (!projects?.length) return "";

  const promptTokens = normalizePromptTokens(promptFocus);
  const candidates = projects
    .map((project) => {
      const bits = [
        cleanPhrase(project.projectTitle),
        cleanPhrase(project.projectDescription),
        cleanPhrase(project.responsibilities),
      ].filter(Boolean);
      const text = bits.join(". ");
      const lowered = text.toLowerCase();
      const score = promptTokens.reduce((count, token) => (lowered.includes(token) ? count + 1 : count), 0);
      return { text, score };
    })
    .filter((item) => item.text && !looksLikeResumeNoise(item.text))
    .sort((a, b) => b.score - a.score || a.text.length - b.text.length);

  return candidates[0]?.text ? trimToSentenceBoundary(candidates[0].text, 140) : "";
}

function normalizePromptTokens(prompt: string) {
  return cleanPhrase(prompt)
    .toLowerCase()
    .split(/[^a-z0-9+#./-]+/)
    .filter((token) => token.length >= 3);
}

function pickRelevantSkills(prompt: string, candidates: string[]) {
  const promptTokens = normalizePromptTokens(prompt);
  if (!promptTokens.length) return candidates.slice(0, 4);

  const scored = candidates
    .map((skill) => {
      const normalized = skill.toLowerCase();
      const score = promptTokens.reduce((count, token) => {
        return normalized.includes(token) ? count + 1 : count;
      }, 0);
      return { skill, score };
    })
    .sort((a, b) => b.score - a.score);

  const matched = scored.filter((item) => item.score > 0).map((item) => item.skill);
  return (matched.length ? matched : candidates).slice(0, 4);
}

function buildGeneratedSummaryFromProfile(
  form: BasicDetailsForm,
  prompt: string,
  profile: ResumeProfileData
) {
  const normalizedPrompt = cleanPhrase(prompt);
  const promptFocus = extractPromptFocus(prompt);
  const title = cleanPhrase(form.professionalTitle) || cleanPhrase(profile.professionalTitle) || "professional";
  const years = cleanPhrase(form.expYears) || cleanPhrase(profile.experienceYears);
  const months = cleanPhrase(form.expMonths) || cleanPhrase(profile.experienceMonths);
  const experienceText = years
    ? `${years}${months && months !== "0" ? ` years and ${months} months` : "+ years"}`
    : "";
  const currentLocation =
    cleanPhrase(form.currentLocation) || cleanPhrase(profile.currentLocation);
  const preferredLocation =
    cleanPhrase(form.preferredLocation) || cleanPhrase(profile.preferredLocation);
  const nationality = cleanPhrase(form.nationality) || cleanPhrase(profile.nationality);
  const existingSummary =
    cleanPhrase(form.summary) || cleanPhrase(profile.summary);

  const skills = dedupeStrings([...(profile.keySkills ?? []), ...(profile.tools ?? [])]).filter(
    (skill) => !looksLikeResumeNoise(skill)
  );
  const promptMatchedSkills = pickRelevantSkills(promptFocus || normalizedPrompt, skills).filter((skill) =>
    isRelevantSkillForPrompt(skill, promptFocus, title)
  );
  const relevantSkills = (promptMatchedSkills.length ? promptMatchedSkills : skills).slice(0, 4);

  const projectHighlight = pickProjectHighlight(profile.projects, promptFocus || normalizedPrompt);

  const educationSignals = dedupeStrings(
    (profile.education ?? []).flatMap((entry) => [entry.title, entry.specialization, entry.institute])
  );
  const educationPhrase = educationSignals[0] ? stripTrailingPeriod(sentenceCase(educationSignals[0])) : "";

  const languages = dedupeStrings((profile.languages ?? []).map((entry) => entry.language));
  const focusLine = promptFocus
    ? `focused on ${stripTrailingPeriod(promptFocus)}`
    : "";

  const firstSentenceParts = [
    title !== "professional" ? title : "Professional",
    experienceText ? `with ${experienceText} of experience` : "",
    currentLocation ? `based in ${currentLocation}` : "",
  ].filter(Boolean);

  const firstSentence = `${firstSentenceParts.join(" ")}.`.replace(/\s+/g, " ");

  const secondSentenceParts = [
    relevantSkills.length ? `Brings hands-on strength in ${formatList(relevantSkills)}` : "",
    focusLine,
    projectHighlight ? `with experience delivering ${stripTrailingPeriod(projectHighlight)}` : "",
  ].filter(Boolean);

  const secondSentence = secondSentenceParts.length
    ? `${secondSentenceParts.join(", ")}.`
    : "";

  const thirdSentenceParts = [
    educationPhrase ? `Backed by ${educationPhrase}` : "",
    languages.length ? `comfortable communicating in ${formatList(languages.slice(0, 3))}` : "",
    preferredLocation
      ? `open to opportunities in ${preferredLocation}`
      : nationality
        ? `bringing a ${nationality} market perspective`
        : "",
  ].filter(Boolean);

  const thirdSentence = thirdSentenceParts.length
    ? `${sentenceCase(thirdSentenceParts.join(", "))}.`
    : "";

  const fallbackSummary = [firstSentence, secondSentence, thirdSentence]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!existingSummary) {
    return trimToSentenceBoundary(fallbackSummary, 600);
  }

  const condensedExisting = looksLikeResumeNoise(existingSummary)
    ? ""
    : trimToSentenceBoundary(existingSummary, 260);
  const enrichedSummaryParts = [
    condensedExisting ? `${stripTrailingPeriod(condensedExisting)}.` : "",
    secondSentence,
    thirdSentence,
  ].filter(Boolean);

  return trimToSentenceBoundary(
    enrichedSummaryParts.join(" ").replace(/\s+/g, " ").trim() || fallbackSummary,
    600
  );
}

function BasicDetailsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<BasicDetailsForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [education, setEducation] = useState<EducationEntry[]>(() => [createEducationEntry()]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>(() => [createCertificationEntry()]);
  const [externalLinks, setExternalLinks] = useState<ExternalLinkEntry[]>([]);
  const [languages, setLanguages] = useState<LanguageEntry[]>(() => [createLanguageEntry()]);
  const [isSummaryDrawerOpen, setIsSummaryDrawerOpen] = useState(false);
  const [summaryPrompt, setSummaryPrompt] = useState("");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState({
    personal: true,
    basicDetails: false,
    education: false,
    certifications: false,
    externalLinks: false,
    languages: false,
  });

  const PROFILE_PIC_STORAGE_KEY = "resumeProfilePic";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(PROFILE_PIC_STORAGE_KEY);
      if (raw) setProfilePicPreview(raw);
    } catch {
      // ignore storage errors
    }
  }, []);

  function handlePickProfilePic() {
    profilePicInputRef.current?.click();
  }

  async function handleProfilePicFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Please upload a valid image (PNG, JPG, GIF, or WEBP).");
      return;
    }

    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxBytes) {
      alert("Profile picture must be under 2 MB.");
      return;
    }

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });

    setProfilePicPreview(dataUrl);
    try {
      window.sessionStorage.setItem(PROFILE_PIC_STORAGE_KEY, dataUrl);
    } catch {
      // ignore storage errors
    }

    // Allow re-selecting the same file.
    e.target.value = "";
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function MobileAccordionCard({
    title,
    expanded,
    onToggle,
    children,
  }: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <span className="text-base font-semibold text-gray-900">{title}</span>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
        {expanded ? <div>{children}</div> : null}
      </div>
    );
  }

  function applyProfileToForm(profile: ResumeProfileData) {
    const expYearsNorm = normalizeExperienceYears(profile.experienceYears);
    const expMonthsNorm = normalizeExperienceMonths(profile.experienceMonths);
    const normalizedGender = normalizeGender(profile.gender);
    const normalizedCountryCode = normalizeCountryCode(profile.countryCode);
    const normalizedDob = normalizeDateForInput(profile.dob);
    setForm((prev) => ({
      ...prev,
      professionalTitle: preferExistingFormValue(prev.professionalTitle, profile.professionalTitle ?? ""),
      expYears: preferExistingFormValue(prev.expYears, expYearsNorm),
      expMonths: preferExistingFormValue(prev.expMonths, expMonthsNorm),
      salary: preferExistingFormValue(prev.salary, profile.salaryPerMonth ?? ""),
      salaryCurrency: preferExistingFormValue(prev.salaryCurrency, profile.salaryCurrency ?? ""),
      summary: preferExistingFormValue(prev.summary, profile.summary ?? ""),
      firstName: preferExistingFormValue(prev.firstName, profile.firstName ?? ""),
      lastName: preferExistingFormValue(prev.lastName, profile.lastName ?? ""),
      dob: preferExistingFormValue(prev.dob, normalizedDob),
      gender: preferExistingFormValue(prev.gender, normalizedGender),
      countryCode: preferExistingFormValue(prev.countryCode, normalizedCountryCode),
      contact: preferExistingFormValue(prev.contact, profile.phone ?? ""),
      email: preferExistingFormValue(prev.email, profile.email ?? ""),
      altEmail: preferExistingFormValue(prev.altEmail, profile.altEmail ?? ""),
      nationality: preferExistingFormValue(prev.nationality, profile.nationality ?? ""),
      currentLocation: preferExistingFormValue(prev.currentLocation, profile.currentLocation ?? ""),
      preferredLocation: preferExistingFormValue(prev.preferredLocation, profile.preferredLocation ?? ""),
    }));

    if (profile.education && profile.education.length) {
      setEducation(
        profile.education.map((entry) =>
          createEducationEntry({
            title: entry.title ?? "",
            institute: entry.institute ?? "",
            specialization: entry.specialization ?? "",
            graduationYear: entry.graduationYear ?? "",
            score: entry.score ?? "",
          })
        )
      );
    }

    if (profile.certifications && profile.certifications.length) {
      setCertifications(
        profile.certifications.map((entry) =>
          createCertificationEntry({
            name: entry.name ?? "",
            issuing: entry.issuing ?? "",
            certificateNumber: entry.certificateNumber ?? "",
            issueDate: entry.issueDate ?? "",
            expirationDate: entry.expirationDate ?? "",
            url: entry.url ?? "",
          })
        )
      );
    }

    if (profile.externalLinks && profile.externalLinks.length) {
      setExternalLinks(
        profile.externalLinks.map((entry) =>
          createExternalLinkEntry({
            label: entry.label ?? "",
            url: entry.url ?? "",
          })
        )
      );
    }

    if (profile.languages && profile.languages.length) {
      setLanguages(
        profile.languages.map((entry) =>
          createLanguageEntry({
            language: entry.language ?? "",
            read: entry.read ?? "",
            write: entry.write ?? "",
            speak: entry.speak ?? "",
          })
        )
      );
    }
  }

  useEffect(() => {
    const queryProfileName =
      searchParams.get("profile")?.trim() ||
      searchParams.get("profile_name")?.trim() ||
      "";
    const effectiveProfileName = queryProfileName || getProfileName() || "";
    // In edit mode, prefer API hydration to avoid stale create-session data overwriting fields.
    if (effectiveProfileName && isLikelyDocId(effectiveProfileName)) return;
    const stored = readResumeProfile();
    console.log("Data from session storage:", stored);
    if (!stored) return;
    applyProfileToForm(stored);
  }, [searchParams.toString()]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const candidateId = getCandidateId();
        const queryProfileName =
          new URLSearchParams(window.location.search).get("profile")?.trim() ||
          new URLSearchParams(window.location.search).get("profile_name")?.trim() ||
          "";
        let profileName = queryProfileName || getProfileName() || "";

        if (queryProfileName && queryProfileName !== getProfileName()) {
          setProfileName(queryProfileName);
        }

        if (!profileName && candidateId && isLikelyDocId(candidateId)) {
          const resolverUrl = new URL("/api/method/resolve_profile_name/", window.location.origin);
          resolverUrl.searchParams.set("candidate_id", candidateId);
          const resolverRes = await fetch(resolverUrl.toString());
          if (resolverRes.ok) {
            const resolverData = (await resolverRes.json()) as { profile_name?: string };
            const resolvedProfileName = resolverData.profile_name?.trim() || "";
            if (resolvedProfileName) {
              profileName = resolvedProfileName;
              setProfileName(resolvedProfileName);
            }
          }
        }

        if (!profileName) return;

        const backendProfile = await getCandidateProfileData(profileName);
        if (cancelled) return;

        const isEditMode = isLikelyDocId(profileName);
        const existingSessionProfile = readResumeProfile() ?? {};
        const merged = isEditMode
          ? backendProfile
          : mergeProfilePreferringExisting(existingSessionProfile, backendProfile);
        upsertResumeProfile(merged);
        applyProfileToForm(merged);
      } catch {
        const fallback = readResumeProfile();
        if (fallback) {
          applyProfileToForm(fallback)
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const section = searchParams.get("section")?.trim().toLowerCase();
    if (!section) return;

    const id =
      section === "certifications"
        ? "certifications-section"
        : section === "education"
          ? "education-section"
          : section === "languages"
            ? "languages-section"
            : "";
    if (!id) return;

    if (isMobileViewport) {
      setMobileAccordionOpen((prev) => ({
        ...prev,
        certifications: section === "certifications" ? true : prev.certifications,
        education: section === "education" ? true : prev.education,
        languages: section === "languages" ? true : prev.languages,
      }));
    }

    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [isMobileViewport, searchParams.toString()]);

  useEffect(() => {
    const trimmedEducation = education
      .map(({ title, institute, specialization, graduationYear, score }) => ({
        title: title.trim(),
        institute: institute.trim(),
        specialization: specialization.trim(),
        graduationYear: graduationYear.trim(),
        score: score.trim(),
      }))
      .filter((entry) => entry.title || entry.institute || entry.specialization || entry.graduationYear || entry.score);

    const trimmedCertifications = certifications
      .map(({ name, issuing, certificateNumber, issueDate, expirationDate, url }) => ({
        name: name.trim(),
        issuing: issuing.trim(),
        certificateNumber: certificateNumber.trim(),
        issueDate: issueDate || undefined,
        expirationDate: expirationDate || undefined,
        url: url.trim(),
      }))
      .filter(
        (entry) =>
          entry.name ||
          entry.issuing ||
          entry.certificateNumber ||
          entry.issueDate ||
          entry.expirationDate ||
          entry.url
      );

    const trimmedLinks = externalLinks
      .map(({ label, url }) => ({
        label: label.trim(),
        url: url.trim(),
      }))
      .filter((entry) => entry.label || entry.url);

    const trimmedLanguages = languages
      .map(({ language, read, write, speak }) => ({
        language: language.trim(),
        read,
        write,
        speak,
      }))
      .filter((entry) => entry.language || entry.read || entry.write || entry.speak);

    upsertResumeProfile({
      education: trimmedEducation,
      certifications: trimmedCertifications,
      externalLinks: trimmedLinks,
      languages: trimmedLanguages,
    });
  }, [education, certifications, externalLinks, languages]);

  const isProfessionalSectionComplete = (() => {
    if (!form.professionalTitle.trim()) return false;
    if (!form.expYears) return false;
    if (!form.expMonths) return false;

    if (!form.salary.trim()) return false;
    const salaryRaw = form.salary.trim().replace(/\s+/g, "");
    if (!/^\d+(,\d{3})*(\.\d+)?$/.test(salaryRaw)) return false;

    if (!form.salaryCurrency) return false;

    const summary = form.summary.trim();
    if (!summary || summary.length < 40) return false;

    return true;
  })();

  const isPersonalSectionComplete = (() => {
    if (!form.firstName.trim()) return false;
    if (!form.lastName.trim()) return false;
    if (!form.dob) return false;
    if (!form.gender) return false;
    if (!form.countryCode) return false;
    if (!form.email.trim() || !emailRegex.test(form.email.trim())) return false;
    if (!form.nationality) return false;
    if (!form.currentLocation.trim()) return false;

    const contactDigits = form.contact.replace(/\D/g, "");
    if (!form.contact.trim()) return false;
    if (contactDigits.length < 7 || contactDigits.length > 15) return false;

    return true;
  })();

  const isEducationComplete = education.some(
    (entry) => entry.title.trim() && entry.institute.trim()
  );

  const isCertificationsComplete = certifications.some(
    (entry) => entry.name.trim() && entry.issuing.trim()
  );

  const completionPercent = (() => {
    let completedSections = 0;
    const totalSections = 4;

    if (isProfessionalSectionComplete) completedSections += 1;
    if (isPersonalSectionComplete) completedSections += 1;
    if (isEducationComplete) completedSections += 1;
    if (isCertificationsComplete) completedSections += 1;

    const ratio = Math.min(1, completedSections / totalSections);
    return 10 + ratio * 30;
  })();

  function setField<K extends keyof BasicDetailsForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));

    // Persist manual edits immediately so the final "Finish" step
    // (which reads from session via readResumeProfile) includes them.
    const trimmed = typeof value === "string" ? value.trim() : value;
    const patch: ResumeProfileData = {};
    switch (key) {
      case "professionalTitle":
        patch.professionalTitle = trimmed || undefined;
        break;
      case "expYears":
        patch.experienceYears = trimmed || undefined;
        break;
      case "expMonths":
        patch.experienceMonths = trimmed || undefined;
        break;
      case "salary":
        patch.salaryPerMonth = trimmed || undefined;
        break;
      case "salaryCurrency":
        patch.salaryCurrency = trimmed || undefined;
        break;
      case "summary":
        patch.summary = trimmed || undefined;
        break;
      case "firstName":
        patch.firstName = trimmed || undefined;
        break;
      case "lastName":
        patch.lastName = trimmed || undefined;
        break;
      case "dob":
        patch.dob = value || undefined;
        break;
      case "gender":
        patch.gender = trimmed || undefined;
        break;
      case "countryCode":
        patch.countryCode = trimmed || undefined;
        break;
      case "contact":
        patch.phone = trimmed || undefined;
        break;
      case "email":
        patch.email = trimmed || undefined;
        break;
      case "altEmail":
        patch.altEmail = trimmed || undefined;
        break;
      case "nationality":
        patch.nationality = trimmed || undefined;
        break;
      case "currentLocation":
        patch.currentLocation = trimmed || undefined;
        break;
      case "preferredLocation":
        patch.preferredLocation = trimmed || undefined;
        break;
      default:
        break;
    }

    if (Object.keys(patch).length) {
      upsertResumeProfile(patch);
    }
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (!form.professionalTitle.trim()) nextErrors.professionalTitle = "Professional title is required.";
    if (!form.expYears) nextErrors.expYears = "Select experience in years.";
    if (!form.expMonths) nextErrors.expMonths = "Select experience in months.";

    if (!form.salary.trim()) {
      nextErrors.salary = "Salary is required.";
    } else if (!/^\d+(,\d{3})*(\.\d+)?$/.test(form.salary.trim().replace(/\s+/g, ""))) {
      nextErrors.salary = "Enter a valid salary value.";
    }

    if (!form.salaryCurrency) nextErrors.salaryCurrency = "Select a currency.";

    if (!form.summary.trim()) {
      nextErrors.summary = "Summary is required.";
    } else if (form.summary.trim().length < 40) {
      nextErrors.summary = "Summary should be at least 40 characters.";
    }

    if (!form.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!form.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!form.dob) nextErrors.dob = "Date of birth is required.";
    if (!form.gender) nextErrors.gender = "Select gender.";
    if (!form.countryCode) nextErrors.countryCode = "Select country code.";

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailRegex.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.nationality) nextErrors.nationality = "Select nationality.";
    if (!form.currentLocation.trim()) nextErrors.currentLocation = "Current location is required.";

    const contactDigits = form.contact.replace(/\D/g, "");
    if (!form.contact.trim()) {
      nextErrors.contact = "Contact number is required.";
    } else if (contactDigits.length < 7 || contactDigits.length > 15) {
      nextErrors.contact = "Enter a valid contact number.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }
  function updateEducationEntry(id: string, field: keyof Omit<EducationEntry, "id">, value: string) {
    setEducation((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  }

  function addEducationEntry() {
    setEducation((prev) => [...prev, createEducationEntry()]);
  }

  function removeEducationEntry(id: string) {
    setEducation((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      return next.length ? next : [createEducationEntry()];
    });
  }

  function updateCertificationEntry(
    id: string,
    field: keyof Omit<CertificationEntry, "id">,
    value: string
  ) {
    setCertifications((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  }

  function addCertificationEntry() {
    setCertifications((prev) => [...prev, createCertificationEntry()]);
  }

  function removeCertificationEntry(id: string) {
    setCertifications((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      return next.length ? next : [createCertificationEntry()];
    });
  }

  function updateExternalLink(id: string, field: keyof Omit<ExternalLinkEntry, "id">, value: string) {
    setExternalLinks((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  }

  function addExternalLink() {
    setExternalLinks((prev) => [...prev, createExternalLinkEntry()]);
  }

  function removeExternalLink(id: string) {
    setExternalLinks((prev) => prev.filter((entry) => entry.id !== id));
  }

  function updateLanguageEntry(id: string, field: keyof Omit<LanguageEntry, "id">, value: string) {
    setLanguages((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  }

  function addLanguageEntry() {
    setLanguages((prev) => [...prev, createLanguageEntry()]);
  }

  function removeLanguageEntry(id: string) {
    setLanguages((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      return next.length ? next : [createLanguageEntry()];
    });
  }

  function openSummaryDrawer() {
    setSummaryPrompt("");
    setGeneratedSummary("");
    setIsSummaryDrawerOpen(true);
  }

  function closeSummaryDrawer() {
    setIsSummaryDrawerOpen(false);
    setIsGeneratingSummary(false);
  }

  function handleGenerateSummary() {
    const prompt = summaryPrompt.trim();
    if (!prompt) return;

    setIsGeneratingSummary(true);
    window.setTimeout(() => {
      const profileSnapshot = readResumeProfile() ?? {};
      const mergedProfile: ResumeProfileData = {
        ...profileSnapshot,
        professionalTitle: form.professionalTitle.trim() || profileSnapshot.professionalTitle,
        experienceYears: form.expYears || profileSnapshot.experienceYears,
        experienceMonths: form.expMonths || profileSnapshot.experienceMonths,
        currentLocation: form.currentLocation.trim() || profileSnapshot.currentLocation,
        preferredLocation: form.preferredLocation.trim() || profileSnapshot.preferredLocation,
        nationality: form.nationality || profileSnapshot.nationality,
        education: education
          .map(({ title, institute, specialization, graduationYear, score }) => ({
            title: title.trim(),
            institute: institute.trim(),
            specialization: specialization.trim(),
            graduationYear: graduationYear.trim(),
            score: score.trim(),
          }))
          .filter((entry) => entry.title || entry.institute || entry.specialization || entry.graduationYear || entry.score),
        languages: languages
          .map(({ language, read, write, speak }) => ({
            language: language.trim(),
            read: read.trim(),
            write: write.trim(),
            speak: speak.trim(),
          }))
          .filter((entry) => entry.language),
      };
      setGeneratedSummary(buildGeneratedSummary(form, prompt, mergedProfile));
      setIsGeneratingSummary(false);
    }, 450);
  }

  function handleReplaceSummary() {
    if (!generatedSummary) return;
    setField("summary", generatedSummary);
    setIsSummaryDrawerOpen(false);
  }

  async function handleNext() {
    if (!validate()) return;

    const trimmedEducation = education
      .map(({ title, institute, specialization, graduationYear, score }) => ({
        title: title.trim(),
        institute: institute.trim(),
        specialization: specialization.trim(),
        graduationYear: graduationYear.trim(),
        score: score.trim(),
      }))
      .filter((entry) => entry.title || entry.institute || entry.specialization);

    const trimmedCertifications = certifications
      .map(({ name, issuing, certificateNumber, issueDate, expirationDate, url }) => ({
        name: name.trim(),
        issuing: issuing.trim(),
        certificateNumber: certificateNumber.trim(),
        issueDate: issueDate || undefined,
        expirationDate: expirationDate || undefined,
        url: url.trim(),
      }))
      .filter(
        (entry) =>
          entry.name ||
          entry.issuing ||
          entry.certificateNumber ||
          entry.issueDate ||
          entry.expirationDate ||
          entry.url
      );

    const trimmedLinks = externalLinks
      .map(({ label, url }) => ({
        label: label.trim(),
        url: url.trim(),
      }))
      .filter((entry) => entry.label && entry.url);

    const trimmedLanguages = languages
      .map(({ language, read, write, speak }) => ({
        language: language.trim(),
        read,
        write,
        speak,
      }))
      .filter((entry) => entry.language);

    const payload: ResumeProfileData = {
      professionalTitle: form.professionalTitle.trim(),
      experienceYears: form.expYears,
      experienceMonths: form.expMonths,
      salaryPerMonth: form.salary.trim(),
      salaryCurrency: form.salaryCurrency,
      summary: form.summary.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dob: form.dob,
      gender: form.gender,
      countryCode: form.countryCode,
      phone: form.contact.trim(),
      email: form.email.trim(),
      altEmail: form.altEmail.trim(),
      nationality: form.nationality,
      currentLocation: form.currentLocation.trim(),
      preferredLocation: form.preferredLocation.trim(),
      education: trimmedEducation,
      certifications: trimmedCertifications,
      externalLinks: trimmedLinks,
      languages: trimmedLanguages,
    };

    upsertResumeProfile(payload);
    // Keep Skills & Projects seed data in sync with latest resume session payload
    // so the next step always hydrates from the most recent values.
    if (typeof window !== "undefined") {
      try {
        const mergedProfile = readResumeProfile() ?? payload;
        const firstProject = mergedProfile.projects?.[0];
        window.sessionStorage.setItem(
          "resumeSkills",
          JSON.stringify({
            skills: mergedProfile.keySkills ?? [],
            tools: mergedProfile.tools ?? [],
            projects: mergedProfile.projects ?? [],
            projectDescription: firstProject?.projectDescription ?? "",
            responsibilities: firstProject?.responsibilities ?? "",
          })
        );
      } catch {
        // ignore storage errors
      }
    }
    const queryProfileName =
      searchParams.get("profile")?.trim() ||
      searchParams.get("profile_name")?.trim() ||
      getProfileName() ||
      "";
    const nextUrl = queryProfileName
      ? `/profile/create/skills-projects?profile=${encodeURIComponent(queryProfileName)}`
      : "/profile/create/skills-projects";
    router.push(nextUrl);
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6]">
      <AppNavbar />
      <input
        ref={profilePicInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={handleProfilePicFileChange}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-lg font-bold text-gray-900">Create Profile</h1>
        </div>

        <div className="flex flex-col xl:flex-row flex-1 gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 pb-28 overflow-y-auto">
          <ProfileStepper currentStep={2} />

          {isMobileViewport ? (
            <div className="flex-1 min-w-0 space-y-4">
              <ProfileProgressCard
                percent={completionPercent}
                className="!w-full"
                description="Higher profile strength improves recruiter visibility"
              />

              <MobileAccordionCard
                title="Personal Information"
                expanded={mobileAccordionOpen.personal}
                onToggle={() =>
                  setMobileAccordionOpen((prev) => ({ ...prev, personal: !prev.personal }))
                }
              >
                <div className="p-4 space-y-4">
                  <div className="bg-[#F4F7FC] border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-14 h-14 border border-gray-300 rounded-md bg-white flex items-center justify-center text-primary-600 text-2xl overflow-hidden">
                      {profilePicPreview ? (
                        <img
                          src={profilePicPreview}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span aria-hidden="true">&#9787;</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={handlePickProfilePic}
                        className="inline-flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium bg-white hover:bg-gray-50"
                      >
                        <SmallUploadIcon />
                        Upload
                      </button>
                      <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF up to 2 MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-800">First Name <span className="text-red-500">*</span></span>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => setField("firstName", e.target.value)}
                        placeholder="Enter first name"
                        className={fieldClass(Boolean(errors.firstName))}
                      />
                      {errors.firstName && (
                        <p className="text-xs text-red-500">{errors.firstName}</p>
                      )}
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-800">Last Name <span className="text-red-500">*</span></span>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => setField("lastName", e.target.value)}
                        placeholder="Enter last name"
                        className={fieldClass(Boolean(errors.lastName))}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-red-500">{errors.lastName}</p>
                      )}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-800">DOB <span className="text-red-500">*</span></span>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => setField("dob", e.target.value)}
                        className={fieldClass(Boolean(errors.dob))}
                      />
                      {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-800">Gender <span className="text-red-500">*</span></span>
                      <select
                        value={form.gender}
                        onChange={(e) => setField("gender", e.target.value)}
                        className={`${fieldClass(Boolean(errors.gender))} bg-white`}
                      >
                        <option value="">Select gender</option>
                        {withCurrentOption(["Male", "Female", "Other"], form.gender).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {errors.gender && (
                        <p className="text-xs text-red-500">{errors.gender}</p>
                      )}
                    </label>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Contact <span className="text-red-500">*</span></span>
                    <div className="flex items-stretch gap-0 rounded-md overflow-hidden border border-gray-200 bg-white">
                      <select
                        value={form.countryCode}
                        onChange={(e) => setField("countryCode", e.target.value)}
                        className={`${fieldClass(Boolean(errors.countryCode))} bg-white px-2 border-none w-auto`}
                        style={{ width: 96 }}
                      >
                        <option value="">Code</option>
                        {withCurrentOption(supportedCountryCodes, form.countryCode).map((code) => (
                          <option key={code} value={code}>
                            {code === "+1" ? "US (+1)" : code === "+91" ? "IN (+91)" : code === "+44" ? "UK (+44)" : code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={form.contact}
                        onChange={(e) => setField("contact", e.target.value)}
                        placeholder="Enter contact number"
                        className={`${fieldClass(Boolean(errors.contact))} w-auto`}
                        style={{ borderRadius: 0, border: "none", flex: 1 }}
                      />
                    </div>
                    {(errors.countryCode || errors.contact) && (
                      <p className="text-xs text-red-500">{errors.countryCode ?? errors.contact}</p>
                    )}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Email <span className="text-red-500">*</span></span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="Enter email"
                      className={fieldClass(Boolean(errors.email))}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Alternative Email</span>
                    <input
                      type="email"
                      value={form.altEmail}
                      onChange={(e) => setField("altEmail", e.target.value)}
                      placeholder="Optional"
                      className={fieldClass(false)}
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Nationality <span className="text-red-500">*</span></span>
                      <select
                        value={form.nationality}
                        onChange={(e) => setField("nationality", e.target.value)}
                        className={`${fieldClass(Boolean(errors.nationality))} bg-white`}
                      >
                        <option value="">Select nationality</option>
                        {withCurrentOption(nationalityOptions, form.nationality).map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                      ))}
                    </select>
                    {errors.nationality && (
                      <p className="text-xs text-red-500">{errors.nationality}</p>
                    )}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Current Location <span className="text-red-500">*</span></span>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.currentLocation}
                        onChange={(e) => setField("currentLocation", e.target.value)}
                        placeholder="City, Country"
                        className={`${fieldClass(Boolean(errors.currentLocation))} pr-10`}
                      />
                      <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    {errors.currentLocation && (
                      <p className="text-xs text-red-500">{errors.currentLocation}</p>
                    )}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Preferred Location</span>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.preferredLocation}
                        onChange={(e) => setField("preferredLocation", e.target.value)}
                        placeholder="Where would you like to work?"
                        className={`${fieldClass(false)} pr-10`}
                      />
                      <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </label>
                </div>
              </MobileAccordionCard>

              <MobileAccordionCard
                title="Basic Details"
                expanded={mobileAccordionOpen.basicDetails}
                onToggle={() =>
                  setMobileAccordionOpen((prev) => ({ ...prev, basicDetails: !prev.basicDetails }))
                }
              >
                <div className="p-4 sm:p-6 space-y-5">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="flex flex-col gap-2 md:col-span-1">
                        <span className="text-sm font-medium text-gray-800">Professional Title <span className="text-red-500">*</span></span>
                        <input
                          type="text"
                          value={form.professionalTitle}
                          onChange={(e) => setField("professionalTitle", e.target.value)}
                          placeholder="Enter professional title"
                          className={fieldClass(Boolean(errors.professionalTitle))}
                        />
                        {errors.professionalTitle && (
                          <p className="text-xs text-red-500">{errors.professionalTitle}</p>
                        )}
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Exp. Years <span className="text-red-500">*</span></span>
                        <select
                          value={form.expYears}
                          onChange={(e) => setField("expYears", e.target.value)}
                          className={`${fieldClass(Boolean(errors.expYears))} bg-white`}
                        >
                          <option value="">Select years</option>
                          {Array.from({ length: 16 }).map((_, idx) => (
                            <option key={idx + 1} value={(idx + 1).toString()}>
                              {idx + 1}
                            </option>
                          ))}
                        </select>
                        {errors.expYears && <p className="text-xs text-red-500">{errors.expYears}</p>}
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Months <span className="text-red-500">*</span></span>
                        <select
                          value={form.expMonths}
                          onChange={(e) => setField("expMonths", e.target.value)}
                          className={`${fieldClass(Boolean(errors.expMonths))} bg-white`}
                        >
                          <option value="">Select months</option>
                          {Array.from({ length: 12 }).map((_, idx) => (
                            <option key={idx} value={idx.toString()}>
                              {idx}
                            </option>
                          ))}
                        </select>
                        {errors.expMonths && <p className="text-xs text-red-500">{errors.expMonths}</p>}
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Salary / Hour <span className="text-red-500">*</span></span>
                        <input
                          type="text"
                          value={form.salary}
                          onChange={(e) => setField("salary", e.target.value)}
                          placeholder="Enter monthly salary"
                          className={fieldClass(Boolean(errors.salary))}
                        />
                        {errors.salary && <p className="text-xs text-red-500">{errors.salary}</p>}
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Salary Currency <span className="text-red-500">*</span></span>
                        <select
                          value={form.salaryCurrency}
                          onChange={(e) => setField("salaryCurrency", e.target.value)}
                          className={`${fieldClass(Boolean(errors.salaryCurrency))} bg-white`}
                        >
                          <option value="">Select currency</option>
                          <option>USD</option>
                          <option>INR</option>
                          <option>EUR</option>
                        </select>
                        {errors.salaryCurrency && (
                          <p className="text-xs text-red-500">{errors.salaryCurrency}</p>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-900">Summary <span className="text-red-500">*</span></span>
                      <button
                        ref={generateButtonRef}
                        type="button"
                        onClick={openSummaryDrawer}
                        className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                      >
                        Generate
                      </button>
                    </div>

                    <textarea
                      value={form.summary}
                      onChange={(e) => setField("summary", e.target.value)}
                      rows={8}
                      maxLength={600}
                      placeholder="Write a short profile summary"
                      className={`${fieldClass(Boolean(errors.summary))} leading-6 resize-y`}
                    />

                    <div className="mt-1 flex items-center justify-between">
                      {errors.summary ? <p className="text-xs text-red-500">{errors.summary}</p> : <span />}
                      <p className="text-xs text-gray-500">{form.summary.length} / 600</p>
                    </div>
                  </div>
                </div>
              </MobileAccordionCard>

              <MobileAccordionCard
                title="Education"
                expanded={mobileAccordionOpen.education}
                onToggle={() =>
                  setMobileAccordionOpen((prev) => ({
                    ...prev,
                    education: !prev.education,
                  }))
                }
              >
                <div id="education-section" className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Add degrees or diplomas you have completed</span>
                    <button
                      type="button"
                      onClick={addEducationEntry}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                    >
                      + Add
                    </button>
                  </div>

                  {education.map((entry, idx) => (
                    <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Education {idx + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeEducationEntry(entry.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                        >
                          <TrashIcon /> Delete
                        </button>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Title</span>
                          <input
                            type="text"
                            value={entry.title}
                            onChange={(e) => updateEducationEntry(entry.id, "title", e.target.value)}
                            placeholder="e.g., Master of Computer Applications"
                            className={fieldClass(false)}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Institute</span>
                          <input
                            type="text"
                            value={entry.institute}
                            onChange={(e) =>
                              updateEducationEntry(entry.id, "institute", e.target.value)
                            }
                            placeholder="Enter institute"
                            className={fieldClass(false)}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Specialization</span>
                          <input
                            type="text"
                            value={entry.specialization}
                            onChange={(e) =>
                              updateEducationEntry(entry.id, "specialization", e.target.value)
                            }
                            placeholder="Enter specialization"
                            className={fieldClass(false)}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Graduation Year</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={entry.graduationYear}
                            onChange={(e) =>
                              updateEducationEntry(entry.id, "graduationYear", e.target.value)
                            }
                            placeholder="e.g., 2016"
                            className={fieldClass(false)}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Score</span>
                          <input
                            type="text"
                            value={entry.score}
                            onChange={(e) => updateEducationEntry(entry.id, "score", e.target.value)}
                            placeholder="e.g., 9.8"
                            className={fieldClass(false)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </MobileAccordionCard>

              <MobileAccordionCard
                title="Certifications"
                expanded={mobileAccordionOpen.certifications}
                onToggle={() =>
                  setMobileAccordionOpen((prev) => ({
                    ...prev,
                    certifications: !prev.certifications,
                  }))
                }
              >
                <div id="certifications-section" className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">List professional certificates you have earned</span>
                    <button
                      type="button"
                      onClick={addCertificationEntry}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                    >
                      + Add
                    </button>
                  </div>

                  {certifications.map((entry) => (
                    <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Certification</p>
                        <button
                          type="button"
                          onClick={() => removeCertificationEntry(entry.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                        >
                          <TrashIcon /> Delete
                        </button>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Name</span>
                          <input
                            type="text"
                            value={entry.name}
                            onChange={(e) => updateCertificationEntry(entry.id, "name", e.target.value)}
                            placeholder="Certificate name"
                            className={fieldClass(false)}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Issuing</span>
                          <input
                            type="text"
                            value={entry.issuing}
                            onChange={(e) =>
                              updateCertificationEntry(entry.id, "issuing", e.target.value)
                            }
                            placeholder="Issuing authority"
                            className={fieldClass(false)}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">#Certificate</span>
                          <input
                            type="text"
                            value={entry.certificateNumber}
                            onChange={(e) =>
                              updateCertificationEntry(entry.id, "certificateNumber", e.target.value)
                            }
                            placeholder="Certificate number"
                            className={fieldClass(false)}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Issue Date</span>
                          <input
                            type="date"
                            value={entry.issueDate}
                            onChange={(e) =>
                              updateCertificationEntry(entry.id, "issueDate", e.target.value)
                            }
                            className={fieldClass(false)}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Expiration Date</span>
                          <input
                            type="date"
                            value={entry.expirationDate}
                            onChange={(e) =>
                              updateCertificationEntry(entry.id, "expirationDate", e.target.value)
                            }
                            className={fieldClass(false)}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">URL</span>
                          <input
                            type="text"
                            value={entry.url}
                            onChange={(e) => updateCertificationEntry(entry.id, "url", e.target.value)}
                            placeholder="https://example.com"
                            className={fieldClass(false)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </MobileAccordionCard>

              <MobileAccordionCard
                title="External Links"
                expanded={mobileAccordionOpen.externalLinks}
                onToggle={() =>
                  setMobileAccordionOpen((prev) => ({
                    ...prev,
                    externalLinks: !prev.externalLinks,
                  }))
                }
              >
                <div id="languages-section" className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Share portfolios, GitHub, or other professional links</span>
                    <button
                      type="button"
                      onClick={addExternalLink}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                    >
                      + Add
                    </button>
                  </div>

                  {externalLinks.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      No external link details added
                      <div className="mt-1 text-xs text-gray-400">
                        Click on + Add to add external link details
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {externalLinks.map((entry) => (
                        <div
                          key={entry.id}
                          className="border border-gray-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="flex flex-col gap-2">
                              <span className="text-sm font-medium text-gray-800">Label</span>
                              <input
                                type="text"
                                value={entry.label}
                                onChange={(e) =>
                                  updateExternalLink(entry.id, "label", e.target.value)
                                }
                                placeholder="e.g., LinkedIn"
                                className={fieldClass(false)}
                              />
                            </label>
                            <label className="flex flex-col gap-2">
                              <span className="text-sm font-medium text-gray-800">URL</span>
                              <input
                                type="text"
                                value={entry.url}
                                onChange={(e) =>
                                  updateExternalLink(entry.id, "url", e.target.value)
                                }
                                placeholder="https://"
                                className={fieldClass(false)}
                              />
                            </label>
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeExternalLink(entry.id)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                            >
                              <TrashIcon /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </MobileAccordionCard>

              <MobileAccordionCard
                title="Languages"
                expanded={mobileAccordionOpen.languages}
                onToggle={() =>
                  setMobileAccordionOpen((prev) => ({
                    ...prev,
                    languages: !prev.languages,
                  }))
                }
              >
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Capture the languages you speak</span>
                    <button
                      type="button"
                      onClick={addLanguageEntry}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                    >
                      + Add
                    </button>
                  </div>

                  {languages.map((entry) => (
                    <div
                      key={entry.id}
                      className="border border-gray-200 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Language</p>
                        <button
                          type="button"
                          onClick={() => removeLanguageEntry(entry.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                        >
                          <TrashIcon /> Delete
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <label className="flex flex-col gap-2 md:col-span-2">
                          <span className="text-sm font-medium text-gray-800">Language</span>
                          <input
                            type="text"
                            value={entry.language}
                            onChange={(e) => updateLanguageEntry(entry.id, "language", e.target.value)}
                            placeholder="English"
                            list="language-options"
                            className={fieldClass(false)}
                          />
                          <datalist id="language-options">
                            {languageOptions.map((lang) => (
                              <option key={lang} value={lang} />
                            ))}
                          </datalist>
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Read</span>
                          <select
                            value={entry.read}
                            onChange={(e) => updateLanguageEntry(entry.id, "read", e.target.value)}
                            className={`${fieldClass(false)} bg-white`}
                          >
                            <option value="">Select</option>
                            {languageRatings.map((rating) => (
                              <option key={`${entry.id}-read-${rating}`} value={rating}>
                                {rating}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Write</span>
                          <select
                            value={entry.write}
                            onChange={(e) => updateLanguageEntry(entry.id, "write", e.target.value)}
                            className={`${fieldClass(false)} bg-white`}
                          >
                            <option value="">Select</option>
                            {languageRatings.map((rating) => (
                              <option key={`${entry.id}-write-${rating}`} value={rating}>
                                {rating}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Speak</span>
                          <select
                            value={entry.speak}
                            onChange={(e) => updateLanguageEntry(entry.id, "speak", e.target.value)}
                            className={`${fieldClass(false)} bg-white`}
                          >
                            <option value="">Select</option>
                            {languageRatings.map((rating) => (
                              <option key={`${entry.id}-speak-${rating}`} value={rating}>
                                {rating}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </MobileAccordionCard>
            </div>
          ) : (
            <>
          <div className="flex-1 min-w-0 space-y-5">
            <section id="education-section" className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Basic Details</h2>
              </div>

              <div className="p-4 sm:p-6 space-y-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex flex-col gap-2 md:col-span-1">
                      <span className="text-sm font-medium text-gray-800">Professional Title <span className="text-red-500">*</span></span>
                      <input
                        type="text"
                        value={form.professionalTitle}
                        onChange={(e) => setField("professionalTitle", e.target.value)}
                        placeholder="Enter professional title"
                        className={fieldClass(Boolean(errors.professionalTitle))}
                      />
                      {errors.professionalTitle && <p className="text-xs text-red-500">{errors.professionalTitle}</p>}
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-800">Exp. Years <span className="text-red-500">*</span></span>
                      <select
                        value={form.expYears}
                        onChange={(e) => setField("expYears", e.target.value)}
                        className={`${fieldClass(Boolean(errors.expYears))} bg-white`}
                      >
                        <option value="">Select years</option>
                        {Array.from({ length: 16 }).map((_, idx) => (
                          <option key={idx + 1} value={(idx + 1).toString()}>
                            {idx + 1}
                          </option>
                        ))}
                      </select>
                      {errors.expYears && <p className="text-xs text-red-500">{errors.expYears}</p>}
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-800">Months <span className="text-red-500">*</span></span>
                      <select
                        value={form.expMonths}
                        onChange={(e) => setField("expMonths", e.target.value)}
                        className={`${fieldClass(Boolean(errors.expMonths))} bg-white`}
                      >
                        <option value="">Select months</option>
                        {Array.from({ length: 12 }).map((_, idx) => (
                          <option key={idx} value={idx.toString()}>
                            {idx}
                          </option>
                        ))}
                      </select>
                      {errors.expMonths && <p className="text-xs text-red-500">{errors.expMonths}</p>}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-800">Salary / Hour <span className="text-red-500">*</span></span>
                      <input
                        type="text"
                        value={form.salary}
                        onChange={(e) => setField("salary", e.target.value)}
                        placeholder="Enter monthly salary"
                        className={fieldClass(Boolean(errors.salary))}
                      />
                      {errors.salary && <p className="text-xs text-red-500">{errors.salary}</p>}
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-800">Salary Currency <span className="text-red-500">*</span></span>
                      <select
                        value={form.salaryCurrency}
                        onChange={(e) => setField("salaryCurrency", e.target.value)}
                        className={`${fieldClass(Boolean(errors.salaryCurrency))} bg-white`}
                      >
                        <option value="">Select currency</option>
                        <option>USD</option>
                        <option>INR</option>
                        <option>EUR</option>
                      </select>
                      {errors.salaryCurrency && <p className="text-xs text-red-500">{errors.salaryCurrency}</p>}
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-900">Summary <span className="text-red-500">*</span></span>
                    <button
                      ref={generateButtonRef}
                      type="button"
                      onClick={openSummaryDrawer}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                    >
                      Generate
                    </button>
                  </div>

                  <textarea
                    value={form.summary}
                    onChange={(e) => setField("summary", e.target.value)}
                    rows={8}
                    maxLength={600}
                    placeholder="Write a short profile summary"
                    className={`${fieldClass(Boolean(errors.summary))} leading-6 resize-y`}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    {errors.summary ? <p className="text-xs text-red-500">{errors.summary}</p> : <span />}
                    <p className="text-xs text-gray-500">{form.summary.length} / 600</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="certifications-section" className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Education</h3>
                  <p className="text-xs text-gray-500">Add degrees or diplomas you have completed</p>
                </div>
                <button
                  type="button"
                  onClick={addEducationEntry}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  + Add
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {education.map((entry, idx) => (
                  <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Education {idx + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeEducationEntry(entry.id)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                      >
                        <TrashIcon /> Delete
                      </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Title</span>
                        <input
                          type="text"
                          value={entry.title}
                          onChange={(e) => updateEducationEntry(entry.id, "title", e.target.value)}
                          placeholder="e.g., Master of Computer Applications"
                          className={fieldClass(false)}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Institute</span>
                        <input
                          type="text"
                          value={entry.institute}
                          onChange={(e) => updateEducationEntry(entry.id, "institute", e.target.value)}
                          placeholder="Enter institute"
                          className={fieldClass(false)}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Specialization</span>
                        <input
                          type="text"
                          value={entry.specialization}
                          onChange={(e) => updateEducationEntry(entry.id, "specialization", e.target.value)}
                          placeholder="Enter specialization"
                          className={fieldClass(false)}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Graduation Year</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entry.graduationYear}
                          onChange={(e) => updateEducationEntry(entry.id, "graduationYear", e.target.value)}
                          placeholder="e.g., 2016"
                          className={fieldClass(false)}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Score</span>
                        <input
                          type="text"
                          value={entry.score}
                          onChange={(e) => updateEducationEntry(entry.id, "score", e.target.value)}
                          placeholder="e.g., 9.8"
                          className={fieldClass(false)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="languages-section" className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
                  <p className="text-xs text-gray-500">List professional certificates you have earned</p>
                </div>
                <button
                  type="button"
                  onClick={addCertificationEntry}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  + Add
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {certifications.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Certification</p>
                      <button
                        type="button"
                        onClick={() => removeCertificationEntry(entry.id)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                      >
                        <TrashIcon /> Delete
                      </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Name</span>
                        <input
                          type="text"
                          value={entry.name}
                          onChange={(e) => updateCertificationEntry(entry.id, "name", e.target.value)}
                          placeholder="Certificate name"
                          className={fieldClass(false)}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Issuing</span>
                        <input
                          type="text"
                          value={entry.issuing}
                          onChange={(e) => updateCertificationEntry(entry.id, "issuing", e.target.value)}
                          placeholder="Issuing authority"
                          className={fieldClass(false)}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">#Certificate</span>
                        <input
                          type="text"
                          value={entry.certificateNumber}
                          onChange={(e) => updateCertificationEntry(entry.id, "certificateNumber", e.target.value)}
                          placeholder="Certificate number"
                          className={fieldClass(false)}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Issue Date</span>
                        <input
                          type="date"
                          value={entry.issueDate}
                          onChange={(e) => updateCertificationEntry(entry.id, "issueDate", e.target.value)}
                          className={fieldClass(false)}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Expiration Date</span>
                        <input
                          type="date"
                          value={entry.expirationDate}
                          onChange={(e) => updateCertificationEntry(entry.id, "expirationDate", e.target.value)}
                          className={fieldClass(false)}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">URL</span>
                        <input
                          type="text"
                          value={entry.url}
                          onChange={(e) => updateCertificationEntry(entry.id, "url", e.target.value)}
                          placeholder="https://example.com"
                          className={fieldClass(false)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">External Links</h3>
                  <p className="text-xs text-gray-500">Share portfolios, GitHub, or other professional links</p>
                </div>
                <button
                  type="button"
                  onClick={addExternalLink}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  + Add
                </button>
              </div>
              {externalLinks.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  No external link details added
                  <div className="mt-1 text-xs text-gray-400">Click on + Add to add external link details</div>
                </div>
              ) : (
                <div className="p-4 sm:p-6 space-y-4">
                  {externalLinks.map((entry) => (
                    <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Label</span>
                          <input
                            type="text"
                            value={entry.label}
                            onChange={(e) => updateExternalLink(entry.id, "label", e.target.value)}
                            placeholder="e.g., LinkedIn"
                            className={fieldClass(false)}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">URL</span>
                          <input
                            type="text"
                            value={entry.url}
                            onChange={(e) => updateExternalLink(entry.id, "url", e.target.value)}
                            placeholder="https://"
                            className={fieldClass(false)}
                          />
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeExternalLink(entry.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                        >
                          <TrashIcon /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Languages</h3>
                  <p className="text-xs text-gray-500">Capture the languages you speak</p>
                </div>
                <button
                  type="button"
                  onClick={addLanguageEntry}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  + Add
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {languages.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Language</p>
                      <button
                        type="button"
                        onClick={() => removeLanguageEntry(entry.id)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                      >
                        <TrashIcon /> Delete
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <label className="flex flex-col gap-2 md:col-span-2">
                        <span className="text-sm font-medium text-gray-800">Language</span>
                        <input
                          type="text"
                          value={entry.language}
                          onChange={(e) => updateLanguageEntry(entry.id, "language", e.target.value)}
                          placeholder="English"
                          list="language-options"
                          className={fieldClass(false)}
                        />
                        <datalist id="language-options">
                          {languageOptions.map((lang) => (
                            <option key={lang} value={lang} />
                          ))}
                        </datalist>
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Read</span>
                        <select
                          value={entry.read}
                          onChange={(e) => updateLanguageEntry(entry.id, "read", e.target.value)}
                          className={`${fieldClass(false)} bg-white`}
                        >
                          <option value="">Select</option>
                          {languageRatings.map((rating) => (
                            <option key={`${entry.id}-read-${rating}`} value={rating}>
                              {rating}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Write</span>
                        <select
                          value={entry.write}
                          onChange={(e) => updateLanguageEntry(entry.id, "write", e.target.value)}
                          className={`${fieldClass(false)} bg-white`}
                        >
                          <option value="">Select</option>
                          {languageRatings.map((rating) => (
                            <option key={`${entry.id}-write-${rating}`} value={rating}>
                              {rating}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Speak</span>
                        <select
                          value={entry.speak}
                          onChange={(e) => updateLanguageEntry(entry.id, "speak", e.target.value)}
                          className={`${fieldClass(false)} bg-white`}
                        >
                          <option value="">Select</option>
                          {languageRatings.map((rating) => (
                            <option key={`${entry.id}-speak-${rating}`} value={rating}>
                              {rating}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="w-full xl:w-96 flex flex-col gap-4 shrink-0">
            <ProfileProgressCard
              percent={completionPercent}
              className="!w-full"
              description="Higher profile strength improves recruiter visibility"
            />

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-200">
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">Personal Information</h3>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-[#F4F7FC] border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-14 h-14 border border-gray-300 rounded-md bg-white flex items-center justify-center text-primary-600 text-2xl overflow-hidden">
                    {profilePicPreview ? (
                      <img
                        src={profilePicPreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span aria-hidden="true">&#9787;</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={handlePickProfilePic}
                      className="inline-flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium bg-white hover:bg-gray-50"
                    >
                      <SmallUploadIcon />
                      Upload
                    </button>
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF up to 2 MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">First Name <span className="text-red-500">*</span></span>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setField("firstName", e.target.value)}
                      placeholder="Enter first name"
                      className={fieldClass(Boolean(errors.firstName))}
                    />
                    {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Last Name <span className="text-red-500">*</span></span>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => setField("lastName", e.target.value)}
                      placeholder="Enter last name"
                      className={fieldClass(Boolean(errors.lastName))}
                    />
                    {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">DOB <span className="text-red-500">*</span></span>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setField("dob", e.target.value)}
                      className={fieldClass(Boolean(errors.dob))}
                    />
                    {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Gender <span className="text-red-500">*</span></span>
                    <select
                      value={form.gender}
                      onChange={(e) => setField("gender", e.target.value)}
                      className={`${fieldClass(Boolean(errors.gender))} bg-white`}
                    >
                      <option value="">Select gender</option>
                      {withCurrentOption(["Male", "Female", "Other"], form.gender).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-800">Email <span className="text-red-500">*</span></span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="Enter email"
                    className={fieldClass(Boolean(errors.email))}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-800">Alternative Email</span>
                  <input
                    type="email"
                    value={form.altEmail}
                    onChange={(e) => setField("altEmail", e.target.value)}
                    placeholder="Optional"
                    className={fieldClass(false)}
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Nationality <span className="text-red-500">*</span></span>
                    <select
                      value={form.nationality}
                      onChange={(e) => setField("nationality", e.target.value)}
                      className={`${fieldClass(Boolean(errors.nationality))} bg-white`}
                    >
                      <option value="">Select nationality</option>
                      {withCurrentOption(nationalityOptions, form.nationality).map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    {errors.nationality && <p className="text-xs text-red-500">{errors.nationality}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Current Location <span className="text-red-500">*</span></span>
                    <input
                      type="text"
                      value={form.currentLocation}
                      onChange={(e) => setField("currentLocation", e.target.value)}
                      placeholder="City, Country"
                      className={fieldClass(Boolean(errors.currentLocation))}
                    />
                    {errors.currentLocation && <p className="text-xs text-red-500">{errors.currentLocation}</p>}
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-800">Preferred Location</span>
                  <input
                    type="text"
                    value={form.preferredLocation}
                    onChange={(e) => setField("preferredLocation", e.target.value)}
                    placeholder="Where would you like to work?"
                    className={fieldClass(false)}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-800">Contact <span className="text-red-500">*</span></span>
                  <div className="grid grid-cols-[84px_1fr] gap-2">
                    <select
                      value={form.countryCode}
                      onChange={(e) => setField("countryCode", e.target.value)}
                      className={`${fieldClass(Boolean(errors.countryCode))} bg-white px-2`}
                    >
                      <option value="">Code</option>
                      {withCurrentOption(supportedCountryCodes, form.countryCode).map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={form.contact}
                      onChange={(e) => setField("contact", e.target.value)}
                      placeholder="Enter contact number"
                      className={fieldClass(Boolean(errors.contact))}
                    />
                  </div>
                  {(errors.countryCode || errors.contact) && (
                    <p className="text-xs text-red-500">{errors.countryCode ?? errors.contact}</p>
                  )}
                </label>
              </div>
            </section>
          </div>
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex justify-end gap-3">
        <Button fullWidth={false} className="px-6 sm:px-8" onClick={handleNext}>
          Next
        </Button>
      </div>

      <BaseDrawer
        open={isSummaryDrawerOpen}
        onClose={closeSummaryDrawer}
        title="Generate Summary"
        triggerRef={generateButtonRef}
        widthClassName="sm:w-[420px]"
        bodyClassName="px-5 py-4"
        contentClassName="space-y-4"
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              fullWidth={false}
              className="px-5 text-xs sm:text-sm"
              disabled={!generatedSummary}
              onClick={handleReplaceSummary}
            >
              Replace Summary
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <label htmlFor="summary-prompt" className="text-sm font-medium text-gray-800">
            Prompt
          </label>
          <textarea
            id="summary-prompt"
            rows={4}
            maxLength={300}
            value={summaryPrompt}
            onChange={(e) => setSummaryPrompt(e.target.value)}
            placeholder="Generate a summary for a senior engineer"
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex justify-end text-xs text-gray-500">{summaryPrompt.length} / 300</div>
        </div>

        <div className="flex justify-start">
          <Button
            type="button"
            variant="outline"
            fullWidth={false}
            className="px-5 py-2 text-xs sm:text-sm"
            disabled={!summaryPrompt.trim() || isGeneratingSummary}
            onClick={handleGenerateSummary}
          >
            {isGeneratingSummary ? "Generating..." : "Generate"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-800">Preview</p>
          <div className="min-h-[180px] rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm leading-6 text-gray-700">
            {generatedSummary || "Your generated summary will appear here."}
          </div>
        </div>
      </BaseDrawer>
    </div>
  );
}

export default function BasicDetailsPage() {
  return (
    <Suspense fallback={null}>
      <BasicDetailsPageContent />
    </Suspense>
  );
}
