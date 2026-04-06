"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { BaseDrawer } from "@/components/ui/BaseDrawer";
import { SmallUploadIcon, TrashIcon } from "@/components/icons";
import { upsertResumeProfile, readResumeProfile } from "@/lib/profileSession";
import { getCandidateId } from "@/lib/authSession";
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

function buildGeneratedSummary(form: BasicDetailsForm, prompt: string) {
  const title = form.professionalTitle.trim() || "professional";
  const years = form.expYears ? `${form.expYears}+ years` : "several years";
  const months = form.expMonths && form.expMonths !== "0" ? ` and ${form.expMonths} months` : "";
  const location = form.currentLocation.trim();
  const preferences = prompt.trim().replace(/\s+/g, " ");
  const focusAreas = [
    form.preferredLocation.trim() ? `open to opportunities in ${form.preferredLocation.trim()}` : "",
    form.nationality ? `bringing a ${form.nationality} market perspective` : "",
    preferences ? `with emphasis on ${preferences}` : "",
  ].filter(Boolean);

  const summaryParts = [
    `Results-driven ${title} with ${years}${months} of experience delivering high-impact work across cross-functional teams.`,
    location ? `Based in ${location}, with a strong track record of translating business needs into practical execution.` : "",
    focusAreas.length ? `${focusAreas.join(", ")}.` : "",
    "Known for clear communication, ownership, and building reliable outcomes in fast-moving environments.",
  ].filter(Boolean);

  return summaryParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 600);
}

export default function BasicDetailsPage() {
  const router = useRouter();
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const [lookingForJob, setLookingForJob] = useState(true);
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
    setForm((prev) => ({
      ...prev,
      professionalTitle: profile.professionalTitle ?? prev.professionalTitle,
      expYears: expYearsNorm || prev.expYears,
      expMonths: expMonthsNorm || prev.expMonths,
      salary: profile.salaryPerMonth ?? prev.salary,
      salaryCurrency: profile.salaryCurrency ?? prev.salaryCurrency,
      summary: profile.summary ?? prev.summary,
      firstName: profile.firstName ?? prev.firstName,
      lastName: profile.lastName ?? prev.lastName,
      dob: profile.dob ?? prev.dob,
      gender: profile.gender ?? prev.gender,
      countryCode: profile.countryCode ?? prev.countryCode,
      contact: profile.phone ?? prev.contact,
      email: profile.email ?? prev.email,
      altEmail: profile.altEmail ?? prev.altEmail,
      nationality: profile.nationality ?? prev.nationality,
      currentLocation: profile.currentLocation ?? prev.currentLocation,
      preferredLocation: profile.preferredLocation ?? prev.preferredLocation,
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
    const stored = readResumeProfile();
    console.log("Data from session storage:", stored);
    if (!stored) return;
    applyProfileToForm(stored);
  }, []);

  useEffect(() => {
    const candidateId = getCandidateId();
    if (!candidateId) return;

    const sessionProfile = readResumeProfile();
    if (sessionProfile) return;

    let cancelled = false;
    (async () => {
      try {
        const backendProfile = await getCandidateProfileData(candidateId);
        if (cancelled) return;

        const merged = { ...backendProfile };

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
      setGeneratedSummary(buildGeneratedSummary(form, prompt));
      setIsGeneratingSummary(false);
    }, 450);
  }

  function handleReplaceSummary() {
    if (!generatedSummary) return;
    setField("summary", generatedSummary);
    setIsSummaryDrawerOpen(false);
  }

  function handleNext() {
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
      .filter((entry) => entry.name || entry.issuing);

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
      professionalTitle: form.professionalTitle.trim() || undefined,
      experienceYears: form.expYears || undefined,
      experienceMonths: form.expMonths || undefined,
      salaryPerMonth: form.salary.trim() || undefined,
      salaryCurrency: form.salaryCurrency || undefined,
      summary: form.summary.trim() || undefined,
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      dob: form.dob || undefined,
      gender: form.gender || undefined,
      countryCode: form.countryCode || undefined,
      phone: form.contact.trim() || undefined,
      email: form.email.trim() || undefined,
      altEmail: form.altEmail.trim() || undefined,
      nationality: form.nationality || undefined,
      currentLocation: form.currentLocation.trim() || undefined,
      preferredLocation: form.preferredLocation.trim() || undefined,
      education: trimmedEducation.length ? trimmedEducation : undefined,
      certifications: trimmedCertifications.length ? trimmedCertifications : undefined,
      externalLinks: trimmedLinks.length ? trimmedLinks : undefined,
      languages: trimmedLanguages.length ? trimmedLanguages : undefined,
    };

    upsertResumeProfile(payload);
    router.push("/profile/create/skills-projects");
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
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-fit">
            <Toggle
              id="looking-for-job"
              label="Looking for a Job"
              checked={lookingForJob}
              onChange={setLookingForJob}
            />
          </div>
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
                      <span className="text-sm font-medium text-gray-800">First Name</span>
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
                      <span className="text-sm font-medium text-gray-800">Last Name</span>
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
                      <span className="text-sm font-medium text-gray-800">DOB</span>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => setField("dob", e.target.value)}
                        className={fieldClass(Boolean(errors.dob))}
                      />
                      {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-800">Gender</span>
                      <select
                        value={form.gender}
                        onChange={(e) => setField("gender", e.target.value)}
                        className={`${fieldClass(Boolean(errors.gender))} bg-white`}
                      >
                        <option value="">Select gender</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                      {errors.gender && (
                        <p className="text-xs text-red-500">{errors.gender}</p>
                      )}
                    </label>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Contact</span>
                    <div className="flex items-stretch gap-0 rounded-md overflow-hidden border border-gray-200 bg-white">
                      <select
                        value={form.countryCode}
                        onChange={(e) => setField("countryCode", e.target.value)}
                        className={`${fieldClass(Boolean(errors.countryCode))} bg-white px-2 border-none w-auto`}
                        style={{ width: 96 }}
                      >
                        <option value="">Code</option>
                        <option value="+1">US (+1)</option>
                        <option value="+91">IN (+91)</option>
                        <option value="+44">UK (+44)</option>
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
                    <span className="text-sm font-medium text-gray-800">Email</span>
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
                    <span className="text-sm font-medium text-gray-800">Nationality</span>
                    <select
                      value={form.nationality}
                      onChange={(e) => setField("nationality", e.target.value)}
                      className={`${fieldClass(Boolean(errors.nationality))} bg-white`}
                    >
                      <option value="">Select nationality</option>
                      {nationalityOptions.map((country) => (
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
                    <span className="text-sm font-medium text-gray-800">Current Location</span>
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
                        <span className="text-sm font-medium text-gray-800">Professional Title</span>
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
                        <span className="text-sm font-medium text-gray-800">Exp. Years</span>
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
                        <span className="text-sm font-medium text-gray-800">Months</span>
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
                        <span className="text-sm font-medium text-gray-800">Salary / Month</span>
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
                        <span className="text-sm font-medium text-gray-800">Salary Currency</span>
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
                      <span className="text-sm font-semibold text-gray-900">Summary</span>
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
                <div className="p-4 sm:p-6 space-y-4">
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
                <div className="p-4 sm:p-6 space-y-4">
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
                <div className="p-4 sm:p-6 space-y-4">
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
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Basic Details</h2>
              </div>

              <div className="p-4 sm:p-6 space-y-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex flex-col gap-2 md:col-span-1">
                      <span className="text-sm font-medium text-gray-800">Professional Title</span>
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
                      <span className="text-sm font-medium text-gray-800">Exp. Years</span>
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
                      <span className="text-sm font-medium text-gray-800">Months</span>
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
                      <span className="text-sm font-medium text-gray-800">Salary / Month</span>
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
                      <span className="text-sm font-medium text-gray-800">Salary Currency</span>
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
                    <span className="text-sm font-semibold text-gray-900">Summary</span>
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

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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
                    <span className="text-sm font-medium text-gray-800">First Name</span>
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
                    <span className="text-sm font-medium text-gray-800">Last Name</span>
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
                    <span className="text-sm font-medium text-gray-800">DOB</span>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setField("dob", e.target.value)}
                      className={fieldClass(Boolean(errors.dob))}
                    />
                    {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Gender</span>
                    <select
                      value={form.gender}
                      onChange={(e) => setField("gender", e.target.value)}
                      className={`${fieldClass(Boolean(errors.gender))} bg-white`}
                    >
                      <option value="">Select gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                    {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-800">Email</span>
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
                    <span className="text-sm font-medium text-gray-800">Nationality</span>
                    <select
                      value={form.nationality}
                      onChange={(e) => setField("nationality", e.target.value)}
                      className={`${fieldClass(Boolean(errors.nationality))} bg-white`}
                    >
                      <option value="">Select nationality</option>
                      {nationalityOptions.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    {errors.nationality && <p className="text-xs text-red-500">{errors.nationality}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Current Location</span>
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
                  <span className="text-sm font-medium text-gray-800">Contact</span>
                  <div className="grid grid-cols-[84px_1fr] gap-2">
                    <select
                      value={form.countryCode}
                      onChange={(e) => setField("countryCode", e.target.value)}
                      className={`${fieldClass(Boolean(errors.countryCode))} bg-white px-2`}
                    >
                      <option value="">Code</option>
                      <option>+1</option>
                      <option>+91</option>
                      <option>+44</option>
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
        <Button
          variant="outline"
          fullWidth={false}
          onClick={() => router.push("/profile/create")}
          className="px-6 sm:px-8"
        >
          Previous
        </Button>
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
