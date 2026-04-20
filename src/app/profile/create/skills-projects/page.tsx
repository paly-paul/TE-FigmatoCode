"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppNavbar from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { Button } from "@/components/ui/Button";
import { LightbulbIcon, TrashIcon } from "@/components/icons";
import { getSessionLoginEmail, markProfileComplete } from "@/lib/profileOnboarding";
import { setDashboardWelcomePending } from "@/lib/dashboardWelcome";
import { getCandidateId, getProfileName, isLikelyDocId, setProfileName } from "@/lib/authSession";
import { readResumeProfile, upsertResumeProfile } from "@/lib/profileSession";
import { getCandidateProfileData, saveProfile } from "@/services/profile";
import { CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react";
import { MOBILE_MQ } from "@/lib/mobileViewport";
import type { ResumeProfileData } from "@/types/profile";

interface ResumeSkillsData {
  skills?: string[];
  experienceEntries?: Array<{
    experience?: string;
    experienceYears?: string;
    experienceReference?: string;
  }>;
  projects?: Array<{
    projectTitle?: string;
    customerCompany?: string;
    projectDescription?: string;
    responsibilities?: string;
    projectStartDate?: string;
    projectEndDate?: string;
    inProgress?: boolean;
  }>;
  projectDescription?: string;
  responsibilities?: string;
}

const DEFAULT_SUGGESTED_SKILLS = [
  "Communication",
  "Problem Solving",
  "Teamwork",
  "Project Management",
  "MS Excel",
  "Data Analysis",
  "JavaScript",
  "React",
  "Node.js",
  "SQL",
];

interface ExperienceEntry {
  id: string;
  experience: string;
  experienceYears: string;
  experienceReference: string;
}

interface ProjectEntry {
  id: string;
  projectTitle: string;
  customerCompany: string;
  projectStartDate: string;
  projectEndDate: string;
  inProgress: boolean;
  projectDescription: string;
  responsibilities: string;
}

type ExperienceFieldErrors = Partial<Record<keyof Omit<ExperienceEntry, "id">, string>>;
type ProjectFieldErrors = Partial<Record<keyof Omit<ProjectEntry, "id">, string>>;

type FormErrors = {
  skills?: string;
  experiences?: Record<string, ExperienceFieldErrors>;
  projects?: Record<string, ProjectFieldErrors>;
};

type JsonRecord = Record<string, unknown>;

// const SKILL_OPTIONS = [
//   "React",
//   "Next.js",
//   "TypeScript",
//   "JavaScript",
//   "Node.js",
//   "Express",
//   "MongoDB",
//   "PostgreSQL",
//   "AWS",
//   "Docker",
// ];

const fieldClass = (hasError: boolean) =>
  `w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 ${
    hasError ? "border-red-400" : "border-gray-300"
  }`;

function createEntryId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

function createExperienceEntry(overrides: Partial<Omit<ExperienceEntry, "id">> & { id?: string } = {}): ExperienceEntry {
  return {
    id: overrides.id ?? createEntryId("exp"),
    experience: overrides.experience ?? "",
    experienceYears: overrides.experienceYears ?? "",
    experienceReference: overrides.experienceReference ?? "",
  };
}

function createProjectEntry(overrides: Partial<Omit<ProjectEntry, "id">> & { id?: string } = {}): ProjectEntry {
  return {
    id: overrides.id ?? createEntryId("proj"),
    projectTitle: overrides.projectTitle ?? "",
    customerCompany: overrides.customerCompany ?? "",
    projectStartDate: overrides.projectStartDate ?? "",
    projectEndDate: overrides.projectEndDate ?? "",
    inProgress: overrides.inProgress ?? false,
    projectDescription: overrides.projectDescription ?? "",
    responsibilities: overrides.responsibilities ?? "",
  };
}

function isExperienceEmpty(e: ExperienceEntry) {
  return !e.experience.trim() && !e.experienceYears.trim() && !e.experienceReference.trim();
}

function isProjectEmpty(e: ProjectEntry) {
  return (
    !e.projectTitle.trim() &&
    !e.customerCompany.trim() &&
    !e.projectStartDate &&
    !e.projectEndDate &&
    !e.projectDescription.trim() &&
    !e.responsibilities.trim() &&
    !e.inProgress
  );
}

function MobileAccordionCard({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
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

function SkillsProjectsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [skills, setSkills] = useState<string[]>([]);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [backendSkillsStatus, setBackendSkillsStatus] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [experiences, setExperiences] = useState<ExperienceEntry[]>(() => [createExperienceEntry()]);
  const [projects, setProjects] = useState<ProjectEntry[]>(() => [createProjectEntry()]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [lastSubmitWasEdit, setLastSubmitWasEdit] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState({
    keySkills: true,
    experiences: false,
    projects: false,
  });

  // Backend-only options: suggestedSkills holds key skills returned from the API.
  // The dropdown offers those values, excluding ones already selected in `skills`.
  const suggestedSkillOptions = dedupeSkills([
    ...DEFAULT_SUGGESTED_SKILLS,
    ...suggestedSkills,
  ]);
  const hiddenAlreadySelectedCount = suggestedSkillOptions.filter((skill) => {
    const normalized = skill.trim().toLowerCase();
    return skills.some((selected) => selected.trim().toLowerCase() === normalized);
  }).length;

  // Keep dropdown options available in edit mode too:
  // if API suggestions are empty, fall back to already selected skills.
  useEffect(() => {
    if (!skills.length) return;
    setSuggestedSkills((prev) => dedupeSkills([...prev, ...skills]));
  }, [skills]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function validateExperienceEntry(entry: ExperienceEntry): ExperienceFieldErrors {
    const sectionErrors: ExperienceFieldErrors = {};
    if (!entry.experience.trim()) sectionErrors.experience = "Tool/skill is required.";
    if (!entry.experienceYears.trim()) sectionErrors.experienceYears = "Experience years are required.";
    const ref = entry.experienceReference.trim();
    if (ref && !isValidUrl(ref)) {
      sectionErrors.experienceReference = "Enter a valid URL (http/https).";
    }
    return sectionErrors;
  }

  function validateProjectEntry(entry: ProjectEntry): ProjectFieldErrors {
    const sectionErrors: ProjectFieldErrors = {};
    if (!entry.projectTitle.trim()) sectionErrors.projectTitle = "Project title is required.";
    if (!entry.customerCompany.trim()) sectionErrors.customerCompany = "Customer/company is required.";
    if (!entry.projectStartDate) sectionErrors.projectStartDate = "Start date is required.";

    if (!entry.inProgress) {
      if (!entry.projectEndDate) {
        sectionErrors.projectEndDate = "End date is required, or mark In progress.";
      }
    }

    if (entry.projectStartDate && entry.projectEndDate) {
      const start = new Date(entry.projectStartDate);
      const end = new Date(entry.projectEndDate);
      if (end < start) sectionErrors.projectEndDate = "End date cannot be before start date.";
    }

    if (!entry.projectDescription.trim()) {
      sectionErrors.projectDescription = "Project description is required.";
    } else if (entry.projectDescription.trim().length < 30) {
      sectionErrors.projectDescription = "Description should be at least 30 characters.";
    }

    if (!entry.responsibilities.trim()) {
      sectionErrors.responsibilities = "Responsibilities are required.";
    } else if (entry.responsibilities.trim().length < 20) {
      sectionErrors.responsibilities = "Responsibilities should be at least 20 characters.";
    }

    return sectionErrors;
  }

  function nonEmptyExperiences() {
    return experiences.filter((e) => !isExperienceEmpty(e));
  }

  function nonEmptyProjects() {
    return projects.filter((p) => !isProjectEmpty(p));
  }

  function isExperiencesSectionComplete() {
    const filled = nonEmptyExperiences();
    if (filled.length === 0) return false;
    return experiences.every((e) => isExperienceEmpty(e) || Object.keys(validateExperienceEntry(e)).length === 0);
  }

  function isProjectsSectionComplete() {
    const filled = nonEmptyProjects();
    if (filled.length === 0) return false;
    return projects.every((p) => isProjectEmpty(p) || Object.keys(validateProjectEntry(p)).length === 0);
  }

  const completionPercent = (() => {
    const skillsDone = skills.length > 0;
    const experienceDone = isExperiencesSectionComplete();
    const projectsDone = isProjectsSectionComplete();

    let completedSections = 0;
    const totalSections = 3;

    if (skillsDone) completedSections += 1;
    if (experienceDone) completedSections += 1;
    if (projectsDone) completedSections += 1;

    const ratio = Math.min(1, completedSections / totalSections);
    return 40 + ratio * 30;
  })();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queryProfileName =
      searchParams.get("profile")?.trim() ||
      searchParams.get("profile_name")?.trim() ||
      "";
    const effectiveProfileName = queryProfileName || getProfileName() || "";
    if (effectiveProfileName && isLikelyDocId(effectiveProfileName)) return;
    try {
      const raw = window.sessionStorage.getItem("resumeSkills");
      if (!raw) return;
      const data = JSON.parse(raw) as ResumeSkillsData;
      if (Array.isArray(data.skills) && data.skills.length) {
        setSkills((prev) => dedupeSkills([...prev, ...(data.skills || [])]));
        setSuggestedSkills((prev) => dedupeSkills([...prev, ...(data.skills || [])]));
      }
      if (Array.isArray(data.experienceEntries) && data.experienceEntries.length) {
        const normalized = data.experienceEntries
          .map((entry) =>
            createExperienceEntry({
              experience: typeof entry?.experience === "string" ? entry.experience : "",
              experienceYears: typeof entry?.experienceYears === "string" ? entry.experienceYears : "",
              experienceReference:
                typeof entry?.experienceReference === "string" ? entry.experienceReference : "",
            })
          )
          .filter((entry) => !isExperienceEmpty(entry));
        if (normalized.length) {
          setExperiences(normalized);
        }
      }
      if (Array.isArray(data.projects) && data.projects.length) {
        setProjects((prev) =>
          mergeProjectEntries(
            prev,
            data.projects!.map((project) =>
              createProjectEntry({
                projectTitle: typeof project.projectTitle === "string" ? project.projectTitle : "",
                customerCompany: typeof project.customerCompany === "string" ? project.customerCompany : "",
                projectDescription:
                  typeof project.projectDescription === "string" ? project.projectDescription : "",
                responsibilities:
                  typeof project.responsibilities === "string" ? project.responsibilities : "",
                projectStartDate: typeof project.projectStartDate === "string" ? project.projectStartDate : "",
                projectEndDate: typeof project.projectEndDate === "string" ? project.projectEndDate : "",
                inProgress: typeof project.inProgress === "boolean" ? project.inProgress : false,
              })
            )
          )
        );
      } else {
        setProjects((prev) => {
          const first = prev[0];
          if (!first) return prev;
          return [
            {
              ...first,
              projectDescription:
                typeof data.projectDescription === "string" ? data.projectDescription : first.projectDescription,
              responsibilities:
                typeof data.responsibilities === "string" ? data.responsibilities : first.responsibilities,
            },
            ...prev.slice(1),
          ];
        });
      }
    } catch {
      // ignore invalid JSON
    }
  }, [searchParamsKey]);

  useEffect(() => {
    const queryProfileName =
      searchParams.get("profile")?.trim() ||
      searchParams.get("profile_name")?.trim() ||
      "";
    const effectiveProfileName = queryProfileName || getProfileName() || "";
    if (effectiveProfileName && isLikelyDocId(effectiveProfileName)) return;

    const storedProfile = readResumeProfile();
    if (!storedProfile) return;

    if (storedProfile.keySkills?.length) {
      setSkills((prev) => dedupeSkills([...prev, ...storedProfile.keySkills!]));
      setSuggestedSkills((prev) => dedupeSkills([...prev, ...storedProfile.keySkills!]));
    }

    if (storedProfile.tools?.length) {
      const mapped = storedProfile.tools
        .map((tool) =>
          createExperienceEntry({
            experience: tool,
            experienceYears: "",
            experienceReference: "",
          })
        )
        .filter((entry) => !isExperienceEmpty(entry));
      if (mapped.length) {
        setExperiences((prev) => mergeExperienceEntriesPreferRich(prev, mapped));
      }
    }

    if (storedProfile.projects?.length) {
      setProjects((prev) =>
        mergeProjectEntries(
          prev,
          storedProfile.projects!.map((project) =>
            createProjectEntry({
              projectTitle: project.projectTitle ?? "",
              customerCompany: project.customerCompany ?? "",
              projectDescription: project.projectDescription ?? "",
              responsibilities: project.responsibilities ?? "",
              projectStartDate: project.projectStartDate ?? "",
              projectEndDate: project.projectEndDate ?? "",
              inProgress: project.inProgress ?? false,
            })
          )
        )
      );
    }

    // Prefill "Experience" section from backend work experience when available.
    // This is best-effort because backend doesn't always provide explicit years per skill/tool.
    if (storedProfile.workExperience?.length) {
      const parseYears = (duration?: string) => {
        const d = (duration || "").toLowerCase();
        const match = d.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/);
        if (match?.[1]) return match[1];
        return "";
      };
      const mapped = storedProfile.workExperience
        .map((entry) => {
          const title = entry.jobTitle?.trim() || "";
          const company = entry.company?.trim() || "";
          const label = [title, company].filter(Boolean).join(" - ").trim();
          const years = parseYears(entry.duration);
          if (!label) return null;
          return createExperienceEntry({
            experience: label,
            experienceYears: years,
            experienceReference: "",
          });
        })
        .filter(Boolean) as ExperienceEntry[];

      if (mapped.length) {
        setExperiences((prev) => {
          const hasAny = prev.some((e) => !isExperienceEmpty(e));
          return hasAny ? prev : mapped;
        });
      }
    }
  }, [searchParamsKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const candidateId = getCandidateId();
        const queryProfileName =
          searchParams.get("profile")?.trim() ||
          searchParams.get("profile_name")?.trim() ||
          "";
        let profileName = queryProfileName || getProfileName();

        if (queryProfileName && queryProfileName !== getProfileName()) {
          setProfileName(queryProfileName);
        }

        if (!profileName && candidateId) {
          const resolverUrl = new URL("/api/method/resolve_profile_name/", window.location.origin);
          resolverUrl.searchParams.set("candidate_id", candidateId);
          const resolverRes = await fetch(resolverUrl.toString());
          if (resolverRes.ok) {
            const resolverData = (await resolverRes.json()) as { profile_name?: string };
            if (resolverData.profile_name) {
              profileName = resolverData.profile_name;
              setProfileName(profileName);
            }
          }
        }

        if (!profileName) {
          const sessionEmail = getSessionLoginEmail()?.trim() || "";
          if (sessionEmail) {
            const resolverUrl = new URL("/api/method/resolve_profile_name/", window.location.origin);
            resolverUrl.searchParams.set("email", sessionEmail);
            const resolverRes = await fetch(resolverUrl.toString());
            if (resolverRes.ok) {
              const resolverData = (await resolverRes.json()) as { profile_name?: string };
              if (resolverData.profile_name) {
                profileName = resolverData.profile_name;
                setProfileName(profileName);
              }
            }
          }
        }

        if (!profileName) return;
        const isEditMode = isLikelyDocId(profileName);

        if (cancelled) return;

        const generatedSkills = await fetchGeneratedSkillsForProfile(profileName);
        if (cancelled) return;

        const backendProfile = await getCandidateProfileData(profileName);
        if (cancelled) return;
        // Keep session profile synchronized without clobbering newer manual edits
        // captured in this browser session (e.g. basic-details certifications).
        const existingSessionProfile = readResumeProfile() ?? {};
        const mergedProfileForSession = mergeProfilePreferringExisting(
          existingSessionProfile,
          backendProfile
        );
        upsertResumeProfile(mergedProfileForSession);

        if (backendProfile.keySkills?.length) {
          setSkills(dedupeSkills(backendProfile.keySkills));
        }

        if (backendProfile.projects?.length) {
          setProjects(
            backendProfile.projects.map((project) =>
              createProjectEntry({
                projectTitle: project.projectTitle ?? "",
                customerCompany: project.customerCompany ?? "",
                projectStartDate: project.projectStartDate ?? "",
                projectEndDate: project.projectEndDate ?? "",
                inProgress: project.inProgress ?? false,
                projectDescription: project.projectDescription ?? "",
                responsibilities: project.responsibilities ?? "",
              })
            )
          );
        }

        if (backendProfile.workExperience?.length) {
          const backendWorkExperience = backendProfile.workExperience;
          setExperiences((prev) =>
            (isEditMode
              ? backendWorkExperience.map((entry) =>
                  createExperienceEntry({
                    experience: entry.jobTitle || entry.company || "",
                    experienceYears: entry.duration ?? "",
                    experienceReference: "",
                  })
                )
              : mergeExperienceEntriesPreferRich(
                  prev,
                  backendWorkExperience.map((entry) =>
                    createExperienceEntry({
                      experience: entry.jobTitle || entry.company || "",
                      experienceYears: entry.duration ?? "",
                      experienceReference: "",
                    })
                  )
                ))
          );
        }

        // Also fetch raw `get_data` so we can map skills_table/tools + projects_table fully.
        // (Our mapped `getCandidateProfileData` intentionally normalizes to ResumeProfileData.)
        try {
          const rawRes = await fetch("/api/method/get_data/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doctype: "Profile", name: profileName }),
          });
          if (rawRes.ok) {
            const raw = (await rawRes.json()) as any;
            const root = raw?.data ?? raw?.message?.data ?? raw?.message ?? raw;
            const version = root?.profile_version ?? {};

            const toolsTableRaw = Array.isArray(version.skills_table)
              ? version.skills_table
              : Array.isArray(version.tools_table)
                ? version.tools_table
                : [];
            let hasSkillTableMappedExperiences = false;
            if (toolsTableRaw.length) {
              const toolsTableForYears = Array.isArray(version.tools_table) ? version.tools_table : [];
              const yearsByTool = new Map<string, string>();
              for (const item of toolsTableForYears) {
                if (!item || typeof item !== "object") continue;
                const row: any = item;
                const toolName =
                  typeof row?.tool_name === "string"
                    ? row.tool_name.trim()
                    : typeof row?.skill === "string"
                      ? row.skill.trim()
                      : typeof row?.key_skills === "string"
                        ? row.key_skills.trim()
                        : "";
                if (!toolName) continue;
                const yearsRaw =
                  typeof row?.experience_years === "number"
                    ? String(row.experience_years)
                    : typeof row?.experience_years === "string"
                      ? row.experience_years.trim()
                      : typeof row?.experience === "number"
                        ? String(row.experience)
                        : typeof row?.experience === "string"
                          ? row.experience.trim()
                          : "";
                if (!yearsRaw) continue;
                const key = toolName.toLowerCase();
                const prev = yearsByTool.get(key) || "";
                const prevNum = Number.parseFloat(prev);
                const nextNum = Number.parseFloat(yearsRaw);
                const shouldReplace =
                  !prev ||
                  (!Number.isFinite(prevNum) && Number.isFinite(nextNum)) ||
                  (Number.isFinite(prevNum) && Number.isFinite(nextNum) && nextNum > prevNum);
                if (shouldReplace) yearsByTool.set(key, yearsRaw);
              }

              const mapped = toolsTableRaw
                .map((row: any) => {
                  const tool =
                    typeof row?.tool_name === "string"
                      ? row.tool_name.trim()
                      : typeof row?.tool === "string"
                        ? row.tool.trim()
                        : typeof row?.skill_name === "string"
                          ? row.skill_name.trim()
                          : typeof row?.skill === "string"
                            ? row.skill.trim()
                            : typeof row?.key_skills === "string"
                              ? row.key_skills.trim()
                              : "";
                  if (!tool) return null;
                  let years =
                    typeof row?.experience_years === "number"
                      ? String(row.experience_years)
                      : typeof row?.experience_years === "string"
                        ? row.experience_years.trim()
                        : typeof row?.experience === "number"
                          ? String(row.experience)
                          : typeof row?.experience === "string"
                            ? row.experience.trim()
                            : "";
                  const currentYearsNum = Number.parseFloat(years);
                  if (!years || (Number.isFinite(currentYearsNum) && currentYearsNum <= 0)) {
                    const fallbackYears = yearsByTool.get(tool.toLowerCase());
                    if (fallbackYears) years = fallbackYears;
                  }
                  const ref = typeof row?.url === "string" ? row.url.trim() : "";
                  return createExperienceEntry({
                    experience: tool,
                    experienceYears: years,
                    experienceReference: ref,
                  });
                })
                .filter(Boolean) as ExperienceEntry[];
              if (mapped.length) {
                hasSkillTableMappedExperiences = true;
                setExperiences((prev) =>
                  isEditMode ? mapped : mergeExperienceEntriesPreferRich(prev, mapped)
                );
              }
            }

            const projectsTable = Array.isArray(version.projects_table) ? version.projects_table : [];
            if (projectsTable.length) {
              const extractCompanyFromText = (text: any) => {
                const raw = typeof text === "string" ? text.trim() : "";
                if (!raw) return "";
                const m =
                  raw.match(/\b(?:at|with|for)\s+([A-Z][A-Za-z0-9&.,' -]{2,60})(?:\b|,|\.)/) ??
                  raw.match(/\b(?:client|customer)\s*[:\-]\s*([A-Z][A-Za-z0-9&.,' -]{2,60})(?:\b|,|\.)/i);
                return (m?.[1] || "").trim();
              };
              const mapped = projectsTable
                .map((row: any) => {
                  const title =
                    typeof row?.project_name === "string"
                      ? row.project_name.trim()
                      : typeof row?.project_title === "string"
                        ? row.project_title.trim()
                        : typeof row?.projectTitle === "string"
                          ? row.projectTitle.trim()
                      : typeof row?.title === "string"
                        ? row.title.trim()
                        : "";
                  const company =
                    (typeof row?.customer_company === "string" ? row.customer_company.trim() : "") ||
                    extractCompanyFromText(row?.roles_responsibilities) ||
                    extractCompanyFromText(row?.description);
                  const start = typeof row?.start_date === "string" ? row.start_date : "";
                  const end = typeof row?.end_date === "string" ? row.end_date : "";
                  const description = typeof row?.description === "string" ? row.description.trim() : "";
                  const resp =
                    typeof row?.roles_responsibilities === "string"
                      ? row.roles_responsibilities.trim()
                      : typeof row?.role === "string"
                        ? row.role.trim()
                        : "";
                  if (!title && !company && !start) return null;
                  return createProjectEntry({
                    projectTitle: title,
                    customerCompany: company,
                    projectStartDate: start || "01/2000",
                    projectEndDate: end,
                    inProgress: !end,
                    projectDescription: description,
                    responsibilities: resp,
                  });
                })
                .filter(Boolean) as ProjectEntry[];
              if (mapped.length) {
                setProjects(mapped);
              }
            }

            // Prefill "Experience" section from work history / organizations.
            // Prefer backend work_experience if present; otherwise derive from projects_table.
            {
              const parseRoleFromText = (text: any) => {
                const raw = typeof text === "string" ? text.trim() : "";
                if (!raw) return "";
                // Common AI output: "DevOps Engineer responsible for ..."
                const responsibleSplit = raw.split(/\s+responsible\s+for\b/i);
                const head = (responsibleSplit[0] || raw).trim();
                // Keep it short: first ~6 words usually captures the role.
                const words = head.split(/\s+/).filter(Boolean);
                const candidate = words.slice(0, 6).join(" ").trim();
                return candidate.length <= 60 ? candidate : words.slice(0, 4).join(" ");
              };

              const dateToMs = (v: any) => {
                const s = typeof v === "string" ? v.trim() : "";
                if (!s) return null;
                const ms = Date.parse(s);
                return Number.isFinite(ms) ? ms : null;
              };
              const yearsFromRange = (start: any, end: any) => {
                const s = dateToMs(start);
                const e = dateToMs(end) ?? Date.now();
                if (!s) return "";
                const diffYears = Math.max(0, (e - s) / (365.25 * 24 * 60 * 60 * 1000));
                const rounded = Math.max(0, Math.round(diffYears * 10) / 10);
                // Wizard expects a string; keep it simple (e.g. "1" or "1.5")
                return rounded ? String(rounded) : "";
              };

              const workExp = Array.isArray(version.work_experience) ? version.work_experience : [];
              const fromWorkExp =
                workExp.length
                  ? workExp
                      .map((row: any) => {
                        const role = typeof row?.role === "string" ? row.role.trim() : "";
                        const company = typeof row?.company === "string" ? row.company.trim() : "";
                        const label = [role, company].filter(Boolean).join(" - ").trim();
                        if (!label) return null;
                        const years = yearsFromRange(row?.from_date ?? row?.start_date, row?.to_date ?? row?.end_date);
                        const ref = typeof row?.url === "string" ? row.url.trim() : "";
                        return createExperienceEntry({ experience: label, experienceYears: years, experienceReference: ref });
                      })
                      .filter(Boolean)
                  : [];

              if (fromWorkExp.length) {
                setExperiences((prev) =>
                  (isEditMode
                    ? (fromWorkExp as ExperienceEntry[])
                    : mergeExperienceEntriesPreferRich(prev, fromWorkExp as ExperienceEntry[]))
                );
                return;
              }

              const fromProjects =
                projectsTable.length
                  ? projectsTable
                      .map((row: any) => {
                        const company = typeof row?.customer_company === "string" ? row.customer_company.trim() : "";
                        const role = parseRoleFromText(row?.roles_responsibilities);
                        const title = typeof row?.title === "string" ? row.title.trim() : "";
                        // Prefer role; fall back to project title.
                        const base = role || title;
                        const label = [base, company].filter(Boolean).join(" - ").trim();
                        if (!label) return null;
                        const years = yearsFromRange(row?.start_date, row?.end_date);
                        return createExperienceEntry({ experience: label, experienceYears: years, experienceReference: "" });
                      })
                      .filter(Boolean)
                  : [];

              if (hasSkillTableMappedExperiences || !(fromProjects as ExperienceEntry[])?.length) {
                return;
              }

              // De-dupe by normalized label.
              const seen = new Set<string>();
              const deduped = (fromProjects as ExperienceEntry[]).filter((entry) => {
                const key = entry.experience.trim().toLowerCase().replace(/\s+/g, " ");
                if (!key) return false;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });

              if (deduped.length) {
              setExperiences((prev) =>
                isEditMode ? deduped : mergeExperienceEntriesPreferRich(prev, deduped)
              );
              }
            }
          }
        } catch {
          // non-fatal
        }

        const existingSkills = backendProfile.keySkills ?? [];
        const combinedSkills = dedupeSkills([...generatedSkills, ...existingSkills]);

        if (combinedSkills.length) {
          setSuggestedSkills(combinedSkills);

          if (generatedSkills.length && existingSkills.length) {
            setBackendSkillsStatus(
              `Loaded ${existingSkills.length} saved skill(s) and ${generatedSkills.length} new AI-generated skill(s).`
            );
          } else if (generatedSkills.length) {
            setBackendSkillsStatus(`Loaded ${generatedSkills.length} new AI-generated skill(s).`);
          } else {
            setBackendSkillsStatus(
              `No new AI-generated skills; loaded ${existingSkills.length} saved skill(s) from backend profile.`
            );
          }
        } else {
          setBackendSkillsStatus("Backend returned no key skills yet.");
        }
      } catch (error) {
        if (cancelled) return;
        setBackendSkillsStatus(
          error instanceof Error
            ? `Unable to load backend skills: ${error.message}`
            : "Unable to load backend skills."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParamsKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const first = projects[0];
    const payload: ResumeSkillsData = {
      skills,
      experienceEntries: experiences
        .filter((entry) => !isExperienceEmpty(entry))
        .map((entry) => ({
          experience: entry.experience,
          experienceYears: entry.experienceYears,
          experienceReference: entry.experienceReference,
        })),
      projects: projects
        .filter((project) => !isProjectEmpty(project))
        .map((project) => ({
          projectTitle: project.projectTitle,
          customerCompany: project.customerCompany,
          projectDescription: project.projectDescription,
          responsibilities: project.responsibilities,
        })),
      projectDescription: first?.projectDescription ?? "",
      responsibilities: first?.responsibilities ?? "",
    };
    try {
      window.sessionStorage.setItem("resumeSkills", JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [skills, experiences, projects]);

  function updateExperience(id: string, patch: Partial<Omit<ExperienceEntry, "id">>) {
    setExperiences((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setErrors((prev) => {
      const next = { ...prev };
      if (next.experiences?.[id]) {
        const fe = { ...next.experiences[id] };
        for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
          delete fe[k as keyof ExperienceFieldErrors];
        }
        next.experiences = { ...next.experiences, [id]: fe };
        if (Object.keys(next.experiences[id]).length === 0) {
          const { [id]: _, ...rest } = next.experiences;
          next.experiences = Object.keys(rest).length ? rest : undefined;
        }
      }
      return next;
    });
  }

  function updateProject(id: string, patch: Partial<Omit<ProjectEntry, "id">>) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setErrors((prev) => {
      const next = { ...prev };
      if (next.projects?.[id]) {
        const fe = { ...next.projects[id] };
        for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
          delete fe[k as keyof ProjectFieldErrors];
        }
        next.projects = { ...next.projects, [id]: fe };
        if (Object.keys(next.projects[id]).length === 0) {
          const { [id]: _, ...rest } = next.projects;
          next.projects = Object.keys(rest).length ? rest : undefined;
        }
      }
      return next;
    });
  }

  function handleSkillsChange(value: string) {
    if (!value) return;
    setSkills((prev) => {
      if (prev.includes(value)) return prev;
      const next = [...prev, value];
      return next.slice(0, 30);
    });
    setSuggestedSkills((prev) => prev.filter((skill) => skill !== value));
    setSelectedSkill("");
    setErrors((prev) => ({ ...prev, skills: undefined }));
  }

  function handleRemoveSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  function handleAddExperience() {
    const expMap: Record<string, ExperienceFieldErrors> = {};
    for (const e of experiences) {
      if (isExperienceEmpty(e)) continue;
      const fe = validateExperienceEntry(e);
      if (Object.keys(fe).length) expMap[e.id] = fe;
    }
    const last = experiences[experiences.length - 1];
    if (last && isExperienceEmpty(last)) {
      expMap[last.id] = validateExperienceEntry(last);
    }
    if (Object.keys(expMap).length > 0) {
      setErrors((prev) => ({ ...prev, experiences: { ...prev.experiences, ...expMap } }));
      return;
    }
    setExperiences((prev) => [...prev, createExperienceEntry()]);
    setErrors((prev) => ({ ...prev, experiences: undefined }));
  }

  function handleRemoveExperience(id: string) {
    setExperiences((prev) => {
      const next = prev.filter((e) => e.id !== id);
      return next.length ? next : [createExperienceEntry()];
    });
    setErrors((prev) => {
      if (!prev.experiences?.[id]) return prev;
      const { [id]: _, ...rest } = prev.experiences;
      return { ...prev, experiences: Object.keys(rest).length ? rest : undefined };
    });
  }

  function handleAddProject() {
    const last = projects[projects.length - 1];
    if (!last) return;
    const lastErrors = validateProjectEntry(last);
    if (Object.keys(lastErrors).length > 0) {
      setErrors((prev) => ({
        ...prev,
        projects: { ...prev.projects, [last.id]: lastErrors },
      }));
      return;
    }
    setProjects((prev) => [...prev, createProjectEntry()]);
    setErrors((prev) => {
      const next = { ...prev };
      if (next.projects?.[last.id]) {
        const { [last.id]: _, ...rest } = next.projects;
        next.projects = Object.keys(rest).length ? rest : undefined;
      }
      return next;
    });
  }

  function handleRemoveProject(id: string) {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      return next.length ? next : [createProjectEntry()];
    });
    setErrors((prev) => {
      if (!prev.projects?.[id]) return prev;
      const { [id]: _, ...rest } = prev.projects;
      return { ...prev, projects: Object.keys(rest).length ? rest : undefined };
    });
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (skills.length === 0) nextErrors.skills = "Please add at least one skill.";

    const expMap: Record<string, ExperienceFieldErrors> = {};
    const filledExp = nonEmptyExperiences();
    if (filledExp.length === 0) {
      const only = experiences[0];
      if (only) expMap[only.id] = validateExperienceEntry(only);
    } else {
      for (const e of experiences) {
        if (isExperienceEmpty(e)) continue;
        const fe = validateExperienceEntry(e);
        if (Object.keys(fe).length) expMap[e.id] = fe;
      }
    }
    if (Object.keys(expMap).length) nextErrors.experiences = expMap;

    const projMap: Record<string, ProjectFieldErrors> = {};
    const filledProj = nonEmptyProjects();
    if (filledProj.length === 0) {
      const only = projects[0];
      if (only) projMap[only.id] = validateProjectEntry(only);
    } else {
      for (const p of projects) {
        if (isProjectEmpty(p)) continue;
        const fe = validateProjectEntry(p);
        if (Object.keys(fe).length) projMap[p.id] = fe;
      }
    }
    if (Object.keys(projMap).length) nextErrors.projects = projMap;

    setErrors(nextErrors);
    return (
      !nextErrors.skills &&
      !nextErrors.experiences &&
      !nextErrors.projects
    );
  }

  async function handleFinish() {
    if (!validate()) return;

    const storedProfile = readResumeProfile();
    const queryProfileName =
      searchParams.get("profile")?.trim() ||
      searchParams.get("profile_name")?.trim() ||
      "";
    let profileName = queryProfileName || getProfileName() || "";
    setLastSubmitWasEdit(Boolean(profileName));

    const firstName = storedProfile?.firstName?.trim() || "";
    const lastName = storedProfile?.lastName?.trim() || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const email = storedProfile?.email?.trim() || "";
    if (!fullName || !email) {
      alert("Missing profile basics. Please complete Basic Details again before finishing.");
      return;
    }

    if (!profileName) {
      const resolved = await resolveProfileNameByEmail(email);
      if (resolved) {
        profileName = resolved;
        setProfileName(resolved);
      }
    }

    const keySkills = dedupeSkills(skills);

    const skillsTable = nonEmptyExperiences()
      .map((entry) => {
        const skillName = entry.experience.trim();
        const yearsRaw = entry.experienceYears.trim();
        const years = Number.parseFloat(yearsRaw);
        const referenceUrl = entry.experienceReference.trim();
        const normalizedYears = Number.isFinite(years) && years >= 0 ? years : "";
        return {
          skill: skillName || "",
          key_skills: skillName || "",
          // Some backend versions read `experience`, others read `experience_years`.
          experience: normalizedYears,
          experience_years: normalizedYears,
          url: referenceUrl,
        };
      })
      .filter(
        (entry) =>
          entry.skill || entry.key_skills || entry.experience !== "" || entry.experience_years !== "" || entry.url
      );

    const workExperienceTable = nonEmptyExperiences()
      .map((entry) => ({
        role: entry.experience.trim() || "",
        company: "",
        from_date: "",
        to_date: "",
        duration: entry.experienceYears.trim() || "",
        responsibilities: entry.experience.trim() ? [entry.experience.trim()] : [],
        url: entry.experienceReference.trim() || "",
      }))
      .filter((entry) => entry.role || entry.duration || entry.url);

    const educationDetails =
      storedProfile?.education?.map((entry) => ({
        degree: entry.title?.trim() || undefined,
        institution: entry.institute?.trim() || undefined,
        specialization: entry.specialization?.trim() || undefined,
        score: entry.score?.trim() || undefined,
        graduation_year: entry.graduationYear?.trim() || undefined,
        year_of_passing: entry.graduationYear?.trim() || undefined,
        year: entry.graduationYear?.trim() || undefined,
      })).filter(
        (entry) =>
          entry.degree ||
          entry.institution ||
          entry.specialization ||
          entry.score ||
          entry.graduation_year ||
          entry.year_of_passing ||
          entry.year
      ) ?? [];

    const totalExperience = (() => {
      const yearsRaw = storedProfile?.experienceYears?.trim() || "0";
      const years = parseInt(yearsRaw, 10);
      return Number.isFinite(years) && years >= 0 ? years : undefined;
    })();
    const experienceYearsValue = storedProfile?.experienceYears?.trim() || undefined;
    const experienceMonthsValue = storedProfile?.experienceMonths?.trim() || undefined;
    const currentSalaryValue = storedProfile?.salaryPerMonth?.trim() || undefined;
    const currentSalaryCurrencyValue = storedProfile?.salaryCurrency?.trim() || undefined;

    const normalizedCurrentLocation = (storedProfile?.currentLocation || storedProfile?.preferredLocation || "")
      .replace(/\s*--\s*/g, ", ")
      .replace(/\s*,\s*/g, ", ")
      .trim();

    const nextProfilePayload = {
      full_name: fullName,
      email,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: storedProfile?.dob?.trim() || "",
      gender: storedProfile?.gender?.trim() || "",
      country_code: storedProfile?.countryCode?.trim() || "",
      contact_no: storedProfile?.phone?.trim() || "",
      alternative_email: storedProfile?.altEmail?.trim() || "",
      current_location: normalizedCurrentLocation,
      preferred_location: storedProfile?.preferredLocation?.trim() || "",
    };

    const nextProfileVersionPayload = {
      professional_title: storedProfile?.professionalTitle?.trim() || "",
      experience_years: experienceYearsValue,
      experience_months: experienceMonthsValue,
      current_location: normalizedCurrentLocation,
      current_salary: currentSalaryValue,
      current_salary_per_hour: currentSalaryValue,
      current_salary_currency: currentSalaryCurrencyValue,
      salary_per_hour: currentSalaryValue,
      salary_currency: currentSalaryCurrencyValue,
      professional_summary: storedProfile?.summary?.trim() || "",
      nationality: storedProfile?.nationality?.trim() || "",
      preferred_location: storedProfile?.preferredLocation?.trim() || "",
      skills_table: skillsTable,
      key_skills: keySkills,
      education_qualifications: educationDetails.map((entry) => ({
        title: entry.degree || "",
        degree: entry.degree || "",
        institution: entry.institution || "",
        institute: entry.institution || "",
        specialization: entry.specialization || "",
        score: entry.score || "",
        graduation_year: entry.graduation_year || "",
        year_of_passing: entry.year_of_passing || entry.year || "",
        year: entry.year || "",
      })),
      certification_table: storedProfile?.certifications?.length
        ? storedProfile.certifications
            .map((entry) => ({
              certificate: entry.name?.trim() || "",
              certification_name: entry.name?.trim() || "",
              issued_by: entry.issuing?.trim() || "",
              certificate_number: entry.certificateNumber?.trim() || "",
              issued_date: entry.issueDate?.trim() || "",
              issue_date: entry.issueDate?.trim() || "",
              expiry_date: entry.expirationDate?.trim() || "",
              expiration_date: entry.expirationDate?.trim() || "",
              year: entry.issueDate?.trim()?.slice(0, 4) || "",
              url: entry.url?.trim() || "",
            }))
            .filter((entry) =>
              entry.certificate ||
              entry.certification_name ||
              entry.issued_by ||
              entry.certificate_number ||
              entry.issued_date ||
              entry.issue_date ||
              entry.expiry_date ||
              entry.expiration_date ||
              entry.year ||
              entry.url
            )
        : [],
      external_profile_links: storedProfile?.externalLinks?.length
        ? storedProfile.externalLinks
            .map((entry) => ({
              platform: entry.label?.trim() || "",
              url: entry.url?.trim() || "",
            }))
            .filter((entry) => entry.platform || entry.url)
        : [],
      projects_table: nonEmptyProjects()
        .map((project) => ({
          project_name: project.projectTitle?.trim() || "",
          project_title: project.projectTitle?.trim() || "",
          title: project.projectTitle?.trim() || "",
          customer_company: project.customerCompany?.trim() || "",
          start_date: project.projectStartDate || "",
          end_date: project.inProgress ? "" : project.projectEndDate || "",
          description: project.projectDescription?.trim() || "",
          role: project.responsibilities?.trim() || "",
          roles_responsibilities: project.responsibilities?.trim() || "",
        }))
        .filter((entry) =>
          entry.project_name ||
          entry.customer_company ||
          entry.start_date ||
          entry.end_date ||
          entry.description ||
          entry.role
        ),
      languages: storedProfile?.languages?.length
        ? storedProfile.languages
            .map((entry) => ({
              language: entry.language?.trim() || "",
              language_name: entry.language?.trim() || "",
              read: entry.read?.trim() || "",
              write: entry.write?.trim() || "",
              speak: entry.speak?.trim() || "",
            }))
            .filter((entry) => entry.language || entry.read || entry.write || entry.speak)
        : [],
      language_details: storedProfile?.languages?.length
        ? storedProfile.languages
            .map((entry) => ({
              language: entry.language?.trim() || "",
              language_name: entry.language?.trim() || "",
              read: entry.read?.trim() || "",
              write: entry.write?.trim() || "",
              speak: entry.speak?.trim() || "",
            }))
            .filter((entry) => entry.language || entry.read || entry.write || entry.speak)
        : [],
      language_table: storedProfile?.languages?.length
        ? storedProfile.languages
            .map((entry) => ({
              language: entry.language?.trim() || "",
              language_name: entry.language?.trim() || "",
              read: entry.read?.trim() || "",
              write: entry.write?.trim() || "",
              speak: entry.speak?.trim() || "",
            }))
            .filter((entry) => entry.language || entry.read || entry.write || entry.speak)
        : [],
      known_languages: storedProfile?.languages?.length
        ? storedProfile.languages
            .map((entry) => entry.language?.trim() || "")
            .filter(Boolean)
            .join(", ")
        : "",
      work_experience: workExperienceTable,
    };

    const existingEnvelope = profileName ? await fetchExistingProfileEnvelope(profileName) : null;
    const editableProfileFields = [
      "name",
      "full_name",
      "email",
      "first_name",
      "last_name",
      "date_of_birth",
      "gender",
      "country_code",
      "contact_no",
      "alternative_email",
      "current_location",
      "preferred_location",
    ];
    const editableProfileVersionFields = [
      "name",
      "version",
      "profile",
      "professional_title",
      "experience_years",
      "experience_months",
      "current_salary",
      "current_salary_currency",
      "professional_summary",
      "current_location",
      "nationality",
      "preferred_location",
      "skills_table",
      "key_skills",
      "education_qualifications",
      "certification_table",
      "external_profile_links",
      "projects_table",
      "languages",
      "language_details",
      "language_table",
      "known_languages",
      "work_experience",
    ];
    const mergedProfilePayload = mergeWithExistingObject(
      pickObjectFields(existingEnvelope?.profile, editableProfileFields),
      nextProfilePayload as JsonRecord
    );
    const mergedProfileVersionPayload = mergeWithExistingObject(
      pickObjectFields(existingEnvelope?.profile_version, editableProfileVersionFields),
      nextProfileVersionPayload as JsonRecord
    );

    setIsSubmittingProfile(true);
    try {
      console.info("[profile-submit] outgoing payload snapshot", {
        profile: profileName || undefined,
        full_name: fullName,
        email,
        professional_title: storedProfile?.professionalTitle?.trim() || undefined,
        total_experience: totalExperience,
        experience_years: experienceYearsValue,
        experience_months: experienceMonthsValue,
        current_salary: currentSalaryValue,
        current_salary_per_hour: currentSalaryValue,
        current_salary_currency: currentSalaryCurrencyValue,
        salary_per_hour: currentSalaryValue,
        salary_currency: currentSalaryCurrencyValue,
        current_location: normalizedCurrentLocation || undefined,
        key_skills_count: keySkills.length,
        education_details_count: educationDetails.length,
        profile_doc: mergedProfilePayload,
        profile_version: mergedProfileVersionPayload,
      });

      const response = await saveProfile({
        profile: profileName || undefined,
        full_name: fullName,
        email,
        professional_title: storedProfile?.professionalTitle?.trim() || undefined,
        total_experience: totalExperience,
        experience_years: experienceYearsValue,
        experience_months: experienceMonthsValue,
        current_salary: currentSalaryValue,
        current_salary_per_hour: currentSalaryValue,
        current_salary_currency: currentSalaryCurrencyValue,
        salary_per_hour: currentSalaryValue,
        salary_currency: currentSalaryCurrencyValue,
        current_location: normalizedCurrentLocation || undefined,
        key_skills: keySkills.length ? keySkills : undefined,
        education_details: educationDetails.length ? educationDetails : undefined,
        profile_doc: mergedProfilePayload,
        profile_version: mergedProfileVersionPayload,
        action: "submit",
      });

      const linkedProfileFromServerMessage = extractLinkedProfileIdFromServerMessages(response);
      const messageRoot =
        response.message && typeof response.message === "object"
          ? (response.message as Record<string, unknown>)
          : null;
      const savedProfileName =
        (typeof (response as Record<string, unknown>).profile === "string" &&
          ((response as Record<string, unknown>).profile as string).trim()) ||
        (typeof response.profile_name === "string" && response.profile_name.trim()) ||
        (messageRoot && typeof messageRoot.profile === "string" && messageRoot.profile.trim()) ||
        (messageRoot && typeof messageRoot.profile_name === "string" && messageRoot.profile_name.trim()) ||
        "";
      const effectiveProfileName = linkedProfileFromServerMessage || savedProfileName || profileName;

      if (effectiveProfileName) profileName = effectiveProfileName;

      if (profileName) {
        setProfileName(profileName);
      }

      markProfileComplete();
      setIsFinishModalOpen(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setIsSubmittingProfile(false);
    }
  }

  function handleContinueToDashboard() {
    setIsFinishModalOpen(false);
    setDashboardWelcomePending();
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6]">
      <AppNavbar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-lg font-bold text-gray-900">Create Profile</h1>
        </div>

        <div className="flex flex-col xl:flex-row flex-1 gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 pb-28 overflow-y-auto">
          <ProfileStepper currentStep={3} />

          {isMobileViewport ? (
            <div className="flex-1 min-w-0 space-y-4">
              <ProfileProgressCard
                percent={completionPercent}
                className="!w-full"
                description="Skills and projects with proficiency levels attract better-fit opportunities"
              />

              <section className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-16 h-16 rounded-md bg-green-50 text-green-600 flex items-center justify-center text-3xl">
                  <span aria-hidden="true">&#128077;</span>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-semibold text-gray-900">Nice Work!</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    You now have jobs matching your skills and project experience
                  </p>
                </div>
              </section>

              <MobileAccordionCard
                title="Key Skills"
                expanded={mobileAccordionOpen.keySkills}
                onToggle={() =>
                  setMobileAccordionOpen((prev) => ({ ...prev, keySkills: !prev.keySkills }))
                }
              >
                <div className="p-4 space-y-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Skills <span className="text-red-500">*</span></span>
                    <select
                      value={selectedSkill}
                      onChange={(e) => handleSkillsChange(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select a skill</option>
                      {suggestedSkillOptions.map((opt: string) => {
                        const isAlreadyAdded = skills.some(
                          (selected) => selected.trim().toLowerCase() === opt.trim().toLowerCase()
                        );
                        return (
                        <option key={opt} value={opt} disabled={isAlreadyAdded}>
                          {isAlreadyAdded ? `${opt} (Already added)` : opt}
                        </option>
                        );
                      })}
                    </select>
                    <p className="text-xs text-gray-500">Select multiple skills from the dropdown list.</p>
                    {hiddenAlreadySelectedCount > 0 ? (
                      <p className="text-xs text-gray-500">
                        {hiddenAlreadySelectedCount} suggested skill(s) already added and hidden from the list.
                      </p>
                    ) : null}
                    {backendSkillsStatus ? <p className="text-xs text-gray-500">{backendSkillsStatus}</p> : null}
                  </div>

                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="group inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100 px-3 py-1 text-xs font-medium hover:bg-primary-100"
                        >
                          <span>{skill}</span>
                          <span className="text-[11px] text-primary-500 group-hover:text-primary-700">x</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {errors.skills && <p className="text-xs text-red-500">{errors.skills}</p>}

                  <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-gray-700">
                    <span className="mt-0.5 text-primary-600">
                      <LightbulbIcon />
                    </span>
                    <p>Skills linked to projects are prioritized in shortlisting.</p>
                  </div>
                </div>
              </MobileAccordionCard>

              <MobileAccordionCard
                title="Experience"
                expanded={mobileAccordionOpen.experiences}
                onToggle={() =>
                  setMobileAccordionOpen((prev) => ({
                    ...prev,
                    experiences: !prev.experiences,
                  }))
                }
              >
                <div className="p-4 space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-primary-600 font-semibold text-sm hover:text-primary-700"
                      onClick={handleAddExperience}
                    >
                      + Add
                    </button>
                  </div>

                  {experiences.map((entry, idx) => {
                    const fe = errors.experiences?.[entry.id];
                    return (
                      <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">Tool Experience {idx + 1}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveExperience(entry.id)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                          >
                            <TrashIcon /> Delete
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-800">Tool / Skill <span className="text-red-500">*</span></span>
                            <input
                              type="text"
                              value={entry.experience}
                              onChange={(e) => updateExperience(entry.id, { experience: e.target.value })}
                              placeholder="Enter tool or skill"
                              className={fieldClass(Boolean(fe?.experience))}
                            />
                            {fe?.experience && <p className="text-xs text-red-500">{fe.experience}</p>}
                          </label>

                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-800">Exp. in Years <span className="text-red-500">*</span></span>
                            <input
                              type="number"
                              min={0}
                              value={entry.experienceYears}
                              onChange={(e) =>
                                updateExperience(entry.id, { experienceYears: e.target.value })
                              }
                              placeholder="0"
                              className={fieldClass(Boolean(fe?.experienceYears))}
                            />
                            {fe?.experienceYears && (
                              <p className="text-xs text-red-500">{fe.experienceYears}</p>
                            )}
                          </label>

                          <label className="flex flex-col gap-2 col-span-2">
                            <span className="text-sm font-medium text-gray-800">Reference (Link) (optional)</span>
                            <input
                              type="url"
                              value={entry.experienceReference}
                              onChange={(e) =>
                                updateExperience(entry.id, { experienceReference: e.target.value })
                              }
                              placeholder="https://"
                              className={fieldClass(Boolean(fe?.experienceReference))}
                            />
                            {fe?.experienceReference && (
                              <p className="text-xs text-red-500">{fe.experienceReference}</p>
                            )}
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </MobileAccordionCard>

              <MobileAccordionCard
                title="Projects"
                expanded={mobileAccordionOpen.projects}
                onToggle={() =>
                  setMobileAccordionOpen((prev) => ({
                    ...prev,
                    projects: !prev.projects,
                  }))
                }
              >
                <div className="p-4 space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-primary-600 font-semibold text-sm hover:text-primary-700"
                      onClick={handleAddProject}
                    >
                      + Add
                    </button>
                  </div>

                  {projects.map((entry, idx) => {
                    const fe = errors.projects?.[entry.id];
                    return (
                      <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">Project {idx + 1}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(entry.id)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                          >
                            <TrashIcon /> Delete
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-800">Project Title <span className="text-red-500">*</span></span>
                            <input
                              type="text"
                              value={entry.projectTitle}
                              onChange={(e) =>
                                updateProject(entry.id, { projectTitle: e.target.value })
                              }
                              placeholder="Enter project title"
                              className={fieldClass(Boolean(fe?.projectTitle))}
                            />
                            {fe?.projectTitle && <p className="text-xs text-red-500">{fe.projectTitle}</p>}
                          </label>

                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-800">Customer / Company <span className="text-red-500">*</span></span>
                            <input
                              type="text"
                              value={entry.customerCompany}
                              onChange={(e) =>
                                updateProject(entry.id, { customerCompany: e.target.value })
                              }
                              placeholder="Enter customer or company"
                              className={fieldClass(Boolean(fe?.customerCompany))}
                            />
                            {fe?.customerCompany && (
                              <p className="text-xs text-red-500">{fe.customerCompany}</p>
                            )}
                          </label>

                          <div className="grid grid-cols-2 gap-3 col-span-full">
                            <label className="flex flex-col gap-2">
                              <span className="text-sm font-medium text-gray-800">Project Start Date <span className="text-red-500">*</span></span>
                              <input
                                type="date"
                                value={entry.projectStartDate}
                                onChange={(e) =>
                                  updateProject(entry.id, { projectStartDate: e.target.value })
                                }
                                className={fieldClass(Boolean(fe?.projectStartDate))}
                              />
                              {fe?.projectStartDate && (
                                <p className="text-xs text-red-500">{fe.projectStartDate}</p>
                              )}
                            </label>

                            <div className="flex flex-col gap-2">
                              <span className="text-sm font-medium text-gray-800">Project End Date <span className="text-red-500">*</span></span>
                              <input
                                type="date"
                                value={entry.projectEndDate}
                                onChange={(e) =>
                                  updateProject(entry.id, { projectEndDate: e.target.value })
                                }
                                disabled={entry.inProgress}
                                className={`${fieldClass(Boolean(fe?.projectEndDate))} ${
                                  entry.inProgress ? "bg-gray-100 text-gray-500" : ""
                                }`}
                              />
                              {fe?.projectEndDate && (
                                <p className="text-xs text-red-500">{fe.projectEndDate}</p>
                              )}
                              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700 mt-1">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  checked={entry.inProgress}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    updateProject(entry.id, {
                                      inProgress: checked,
                                      ...(checked ? { projectEndDate: "" } : {}),
                                    });
                                    setErrors((prev) => {
                                      if (!prev.projects?.[entry.id]) return prev;
                                      const fePrev = { ...prev.projects[entry.id] };
                                      delete fePrev.projectEndDate;
                                      const nextProj = { ...prev.projects, [entry.id]: fePrev };
                                      if (Object.keys(nextProj[entry.id]).length === 0) {
                                        const { [entry.id]: _, ...rest } = nextProj;
                                        return {
                                          ...prev,
                                          projects: Object.keys(rest).length ? rest : undefined,
                                        };
                                      }
                                      return { ...prev, projects: nextProj };
                                    });
                                  }}
                                />
                                <span>In progress — end date not required</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Description <span className="text-red-500">*</span></span>
                          <textarea
                            value={entry.projectDescription}
                            onChange={(e) =>
                              updateProject(entry.id, { projectDescription: e.target.value })
                            }
                            maxLength={300}
                            rows={5}
                            placeholder="Describe the project"
                            className={`${fieldClass(Boolean(fe?.projectDescription))} leading-6 resize-y`}
                          />
                          <div className="flex items-center justify-between">
                            {fe?.projectDescription ? (
                              <p className="text-xs text-red-500">{fe.projectDescription}</p>
                            ) : (
                              <span />
                            )}
                            <p className="text-xs text-gray-500">{entry.projectDescription.length} / 300</p>
                          </div>
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Responsibilities <span className="text-red-500">*</span></span>
                          <textarea
                            value={entry.responsibilities}
                            onChange={(e) =>
                              updateProject(entry.id, { responsibilities: e.target.value })
                            }
                            maxLength={300}
                            rows={5}
                            placeholder="List your key responsibilities"
                            className={`${fieldClass(Boolean(fe?.responsibilities))} leading-6 resize-y`}
                          />
                          <div className="flex items-center justify-between">
                            {fe?.responsibilities ? (
                              <p className="text-xs text-red-500">{fe.responsibilities}</p>
                            ) : (
                              <span />
                            )}
                            <p className="text-xs text-gray-500">{entry.responsibilities.length} / 300</p>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </MobileAccordionCard>
            </div>
          ) : null}

          {!isMobileViewport ? (
            <div className="flex-1 min-w-0 space-y-4">
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Key Skills</h2>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-800">Skills <span className="text-red-500">*</span></span>
                  <select
                    value={selectedSkill}
                    onChange={(e) => handleSkillsChange(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a skill</option>
                    {suggestedSkillOptions.map((opt) => {
                      const isAlreadyAdded = skills.some(
                        (selected) => selected.trim().toLowerCase() === opt.trim().toLowerCase()
                      );
                      return (
                      <option key={opt} value={opt} disabled={isAlreadyAdded}>
                        {isAlreadyAdded ? `${opt} (Already added)` : opt}
                      </option>
                      );
                    })}
                  </select>
                    <p className="text-xs text-gray-500">Select multiple skills from the dropdown list.</p>
                    {hiddenAlreadySelectedCount > 0 ? (
                      <p className="text-xs text-gray-500">
                        {hiddenAlreadySelectedCount} suggested skill(s) already added and hidden from the list.
                      </p>
                    ) : null}
                  {backendSkillsStatus ? <p className="text-xs text-gray-500">{backendSkillsStatus}</p> : null}
                </div>

                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="group inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100 px-3 py-1 text-xs font-medium hover:bg-primary-100"
                      >
                        <span>{skill}</span>
                        <span className="text-[11px] text-primary-500 group-hover:text-primary-700">x</span>
                      </button>
                    ))}
                  </div>
                )}

                {errors.skills && <p className="text-xs text-red-500">{errors.skills}</p>}

                <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-gray-700">
                  <span className="mt-0.5 text-primary-600">
                    <LightbulbIcon />
                  </span>
                  <p>Skills linked to projects are prioritized in shortlisting.</p>
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Experience</h3>
                <button
                  type="button"
                  className="text-primary-600 font-semibold text-sm hover:text-primary-700"
                  onClick={handleAddExperience}
                >
                  + Add
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {experiences.map((entry, idx) => {
                  const fe = errors.experiences?.[entry.id];
                  return (
                    <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Tool Experience {idx + 1}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(entry.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                        >
                          <TrashIcon /> Delete
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_1.6fr] gap-3">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Tool / Skill <span className="text-red-500">*</span></span>
                          <input
                            type="text"
                            value={entry.experience}
                            onChange={(e) => updateExperience(entry.id, { experience: e.target.value })}
                            placeholder="Enter tool or skill"
                            className={fieldClass(Boolean(fe?.experience))}
                          />
                          {fe?.experience && <p className="text-xs text-red-500">{fe.experience}</p>}
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Exp. in Years <span className="text-red-500">*</span></span>
                          <input
                            type="number"
                            min={0}
                            value={entry.experienceYears}
                            onChange={(e) => updateExperience(entry.id, { experienceYears: e.target.value })}
                            placeholder="0"
                            className={fieldClass(Boolean(fe?.experienceYears))}
                          />
                          {fe?.experienceYears && <p className="text-xs text-red-500">{fe.experienceYears}</p>}
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Reference (Link) (optional)</span>
                          <input
                            type="url"
                            value={entry.experienceReference}
                            onChange={(e) => updateExperience(entry.id, { experienceReference: e.target.value })}
                            placeholder="https://"
                            className={fieldClass(Boolean(fe?.experienceReference))}
                          />
                          {fe?.experienceReference && (
                            <p className="text-xs text-red-500">{fe.experienceReference}</p>
                          )}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Projects</h3>
                <button
                  type="button"
                  className="text-primary-600 font-semibold text-sm hover:text-primary-700"
                  onClick={handleAddProject}
                >
                  + Add
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {projects.map((entry, idx) => {
                  const fe = errors.projects?.[entry.id];
                  return (
                    <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Project {idx + 1}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveProject(entry.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                        >
                          <TrashIcon /> Delete
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Project Title <span className="text-red-500">*</span></span>
                          <input
                            type="text"
                            value={entry.projectTitle}
                            onChange={(e) => updateProject(entry.id, { projectTitle: e.target.value })}
                            placeholder="Enter project title"
                            className={fieldClass(Boolean(fe?.projectTitle))}
                          />
                          {fe?.projectTitle && <p className="text-xs text-red-500">{fe.projectTitle}</p>}
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Customer / Company <span className="text-red-500">*</span></span>
                          <input
                            type="text"
                            value={entry.customerCompany}
                            onChange={(e) => updateProject(entry.id, { customerCompany: e.target.value })}
                            placeholder="Enter customer or company"
                            className={fieldClass(Boolean(fe?.customerCompany))}
                          />
                          {fe?.customerCompany && <p className="text-xs text-red-500">{fe.customerCompany}</p>}
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Project Start Date <span className="text-red-500">*</span></span>
                          <input
                            type="date"
                            value={entry.projectStartDate}
                            onChange={(e) => updateProject(entry.id, { projectStartDate: e.target.value })}
                            className={fieldClass(Boolean(fe?.projectStartDate))}
                          />
                          {fe?.projectStartDate && <p className="text-xs text-red-500">{fe.projectStartDate}</p>}
                        </label>

                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Project End Date <span className="text-red-500">*</span></span>
                          <input
                            type="date"
                            value={entry.projectEndDate}
                            onChange={(e) => updateProject(entry.id, { projectEndDate: e.target.value })}
                            disabled={entry.inProgress}
                            className={`${fieldClass(Boolean(fe?.projectEndDate))} ${entry.inProgress ? "bg-gray-100 text-gray-500" : ""}`}
                          />
                          {fe?.projectEndDate && <p className="text-xs text-red-500">{fe.projectEndDate}</p>}
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700 mt-1">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              checked={entry.inProgress}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                updateProject(entry.id, {
                                  inProgress: checked,
                                  ...(checked ? { projectEndDate: "" } : {}),
                                });
                                setErrors((prev) => {
                                  if (!prev.projects?.[entry.id]) return prev;
                                  const fePrev = { ...prev.projects[entry.id] };
                                  delete fePrev.projectEndDate;
                                  const nextProj = { ...prev.projects, [entry.id]: fePrev };
                                  if (Object.keys(nextProj[entry.id]).length === 0) {
                                    const { [entry.id]: _, ...rest } = nextProj;
                                    return {
                                      ...prev,
                                      projects: Object.keys(rest).length ? rest : undefined,
                                    };
                                  }
                                  return { ...prev, projects: nextProj };
                                });
                              }}
                            />
                            <span>In progress — end date not required</span>
                          </label>
                        </div>
                      </div>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Description <span className="text-red-500">*</span></span>
                        <textarea
                          value={entry.projectDescription}
                          onChange={(e) => updateProject(entry.id, { projectDescription: e.target.value })}
                          maxLength={300}
                          rows={5}
                          placeholder="Describe the project"
                          className={`${fieldClass(Boolean(fe?.projectDescription))} leading-6 resize-y`}
                        />
                        <div className="flex items-center justify-between">
                          {fe?.projectDescription ? (
                            <p className="text-xs text-red-500">{fe.projectDescription}</p>
                          ) : (
                            <span />
                          )}
                          <p className="text-xs text-gray-500">{entry.projectDescription.length} / 300</p>
                        </div>
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-800">Responsibilities <span className="text-red-500">*</span></span>
                        <textarea
                          value={entry.responsibilities}
                          onChange={(e) => updateProject(entry.id, { responsibilities: e.target.value })}
                          maxLength={300}
                          rows={5}
                          placeholder="List your key responsibilities"
                          className={`${fieldClass(Boolean(fe?.responsibilities))} leading-6 resize-y`}
                        />
                        <div className="flex items-center justify-between">
                          {fe?.responsibilities ? (
                            <p className="text-xs text-red-500">{fe.responsibilities}</p>
                          ) : (
                            <span />
                          )}
                          <p className="text-xs text-gray-500">{entry.responsibilities.length} / 300</p>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </section>
            </div>
          ) : null}

          {!isMobileViewport ? (
            <div className="w-full xl:w-96 flex flex-col gap-4 shrink-0 xl:sticky xl:top-4 self-start">
              <ProfileProgressCard
                percent={completionPercent}
                className="!w-full"
                description="Skills and projects with proficiency levels attract better-fit opportunities"
              />

              <section className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-16 h-16 rounded-md bg-green-50 text-green-600 flex items-center justify-center text-3xl">
                  <span aria-hidden="true">&#128077;</span>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-semibold text-gray-900">Nice Work!</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    You now have jobs matching your skills and project experience
                  </p>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex justify-end gap-3">
        <Button
          variant="outline"
          fullWidth={false}
          onClick={() => router.push("/profile/create/basic-details")}
          className="px-6 sm:px-8"
        >
          Previous
        </Button>
        <Button fullWidth={false} className="px-6 sm:px-8" onClick={() => void handleFinish()} disabled={isSubmittingProfile}>
          {isSubmittingProfile ? "Saving..." : "Finish"}
        </Button>
      </div>

      {isFinishModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="relative w-full max-w-[570px] rounded-xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setIsFinishModalOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close success popup"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-6 pb-6 pt-10 sm:px-8 sm:pb-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-primary-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="mx-auto mt-5 max-w-[360px] text-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  {lastSubmitWasEdit ? "Profile updated successfully!" : "Resume submitted successfully!"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {lastSubmitWasEdit
                    ? "Your latest changes have been saved and reflected in your profile."
                    : "Your profile has been updated with all the key details from your resume."}
                </p>
              </div>

              <div className="mx-auto mt-5 flex max-w-[420px] items-center justify-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-primary-600" />
                <span>{lastSubmitWasEdit ? "Profile version updated." : "Profile Version V1.0 created!"}</span>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  fullWidth={false}
                  className="px-6 py-2.5 text-sm"
                  onClick={handleContinueToDashboard}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function resolveProfileNameByEmail(email: string): Promise<string> {
  const normalized = email.trim();
  if (!normalized) return "";
  try {
    const resolverUrl = new URL("/api/method/resolve_profile_name/", window.location.origin);
    resolverUrl.searchParams.set("email", normalized);
    const resolverRes = await fetch(resolverUrl.toString(), { method: "GET" });
    if (!resolverRes.ok) return "";
    const resolverData = (await resolverRes.json()) as { profile_name?: string };
    return resolverData.profile_name?.trim() || "";
  } catch {
    return "";
  }
}

async function fetchExistingProfileEnvelope(profileName: string): Promise<{
  profile?: JsonRecord;
  profile_version?: JsonRecord;
} | null> {
  if (!profileName.trim()) return null;
  try {
    const rawRes = await fetch("/api/method/get_data/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctype: "Profile", name: profileName }),
    });
    if (!rawRes.ok) return null;
    const raw = (await rawRes.json()) as JsonRecord;
    const root =
      (raw.data as JsonRecord | undefined) ||
      ((raw.message as JsonRecord | undefined)?.data as JsonRecord | undefined) ||
      (raw.message as JsonRecord | undefined) ||
      raw;
    const rootRecord =
      root && typeof root === "object" && !Array.isArray(root)
        ? (root as JsonRecord)
        : undefined;

    const profile =
      rootRecord?.profile && typeof rootRecord.profile === "object" && !Array.isArray(rootRecord.profile)
        ? (rootRecord.profile as JsonRecord)
        : rootRecord;

    const profileVersion =
      rootRecord?.profile_version &&
      typeof rootRecord.profile_version === "object" &&
      !Array.isArray(rootRecord.profile_version)
        ? (rootRecord.profile_version as JsonRecord)
        : profile?.profile_version &&
            typeof profile.profile_version === "object" &&
            !Array.isArray(profile.profile_version)
          ? (profile.profile_version as JsonRecord)
          : undefined;

    return { profile, profile_version: profileVersion };
  } catch {
    return null;
  }
}

function mergeWithExistingObject(existing: JsonRecord, next: JsonRecord): JsonRecord {
  const merged: JsonRecord = { ...existing };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) {
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

function pickObjectFields(source: JsonRecord | undefined, keys: string[]): JsonRecord {
  if (!source) return {};
  const picked: JsonRecord = {};
  for (const key of keys) {
    if (source[key] !== undefined) {
      picked[key] = source[key];
    }
  }
  return picked;
}

function extractLinkedProfileIdFromServerMessages(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const record = raw as Record<string, unknown>;
  const serverMessagesRaw = typeof record._server_messages === "string" ? record._server_messages : "";
  if (!serverMessagesRaw.trim()) return "";

  try {
    const arr = JSON.parse(serverMessagesRaw) as unknown;
    if (!Array.isArray(arr)) return "";
    for (const entry of arr) {
      if (typeof entry !== "string") continue;
      let text = entry;
      try {
        const decoded = JSON.parse(entry) as { message?: unknown };
        if (typeof decoded.message === "string" && decoded.message.trim()) {
          text = decoded.message;
        }
      } catch {
        // keep raw string
      }
      const linkedMatch = text.match(/\balready linked to profile\s+((?:PR|PROF)-[A-Za-z0-9-]+)\b/i);
      if (linkedMatch?.[1]) return linkedMatch[1];
    }
  } catch {
    return "";
  }

  return "";
}

export default function SkillsProjectsPage() {
  return (
    <Suspense fallback={null}>
      <SkillsProjectsPageContent />
    </Suspense>
  );
}

function dedupeSkills(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).slice(0, 30);
}

function collectSkillStringsFromUnknown(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/,|\/|;|\||•|\n/g)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSkillStringsFromUnknown(item));
  }

  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;

  const directValues = [
    record.key_skill,
    record.key_skills,
    record.skill,
    record.skills,
  ];
  const direct = directValues.flatMap((item) => collectSkillStringsFromUnknown(item));

  const nestedValues = [
    record.data,
    record.result,
    record.results,
    record.items,
    record.rows,
    record.skills,
  ];
  const nested = nestedValues.flatMap((item) => collectSkillStringsFromUnknown(item));

  return [...direct, ...nested];
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

function isLikelySkillToken(value: string): boolean {
  const token = value.trim();
  const normalized = token.toLowerCase().replace(/\s+/g, " ");
  const allowedTenCharSkills = new Set(["javascript", "typescript"]);
  if (!token) return false;
  if (token.length < 2 || token.length > 50) return false;
  if (/^(?:new-|row-|tmp-)/i.test(token)) return false;
  if (/^[A-Z]{2,10}-\d+(?:-\d+)*$/i.test(token)) return false;
  if (/^[a-f0-9]{8,}$/i.test(token) && !/[aeiou]/i.test(token)) return false;
  // Frappe child-row IDs are commonly random 10-char lowercase/alnum strings (e.g., fiktuvhvfe).
  if (/^[a-z0-9]{10}$/.test(normalized) && !allowedTenCharSkills.has(normalized)) return false;
  if (
    normalized === "skills" ||
    normalized === "technical skills" ||
    normalized === "key skills" ||
    normalized === "tools" ||
    normalized === "technologies" ||
    normalized === "frameworks" ||
    normalized === "core competencies" ||
    normalized === "technical proficiencies"
  ) {
    return false;
  }
  if (/^pr-\d+-\d+/i.test(token)) return false;
  if (/^fetched\s+/i.test(token)) return false;
  if (/^invalid or missing payload$/i.test(token)) return false;
  if (/^no key skills/i.test(token)) return false;
  if (/^status$/i.test(token)) return false;
  if (/^success$/i.test(token)) return false;
  if (/^failed$/i.test(token)) return false;
  if (/^profile$/i.test(token)) return false;
  return true;
}

async function fetchGeneratedSkillsForProfile(profileName: string): Promise<string[]> {
  const url = `/api/method/generate_keyskills_for_profile?profile=${encodeURIComponent(profileName)}`;
  const response = await fetch(url, { method: "GET" });
  let data: unknown = {};
  try {
    data = await response.json();
  } catch {
    // ignore parsing errors
  }

  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const messageNode =
    record.message && typeof record.message === "object"
      ? (record.message as Record<string, unknown>)
      : null;
  const rootStatus = typeof record.status === "string" ? record.status.toLowerCase() : "";
  const status =
    typeof messageNode?.status === "string"
      ? messageNode.status.toLowerCase()
      : rootStatus;
  const backendMessage =
    (typeof messageNode?.message === "string" && messageNode.message) ||
    (typeof record.message === "string" ? record.message : "");

  // Frappe may return business-level "Failed" with "no new key skills".
  // Treat this as an empty result instead of throwing, so dropdown still works.
  if (status === "failed" && /no new key skills/i.test(backendMessage)) {
    return [];
  }

  if (!response.ok) {
    throw new Error(backendMessage || `Key skills API failed (${response.status})`);
  }

  // Backend contract:
  // { status: "Success", message: "...", key_skills: ["Python", ...] }
  // Some environments wrap it as { message: { status, message, key_skills } }.
  const fromRootKeySkills = collectSkillStringsFromUnknown(record.key_skills);
  const fromMessageKeySkills = collectSkillStringsFromUnknown(messageNode?.key_skills);

  const fromRootData = collectSkillStringsFromUnknown(record.data);
  const fromMessageData = collectSkillStringsFromUnknown(messageNode?.data);
  const fromRootSkills = collectSkillStringsFromUnknown(record.key_skills ?? record.skills);
  const fromMessageSkills = collectSkillStringsFromUnknown(messageNode?.skills);

  return dedupeSkills([
    ...fromRootKeySkills,
    ...fromMessageKeySkills,
    ...fromRootData,
    ...fromMessageData,
    ...fromRootSkills,
    ...fromMessageSkills,
  ])
    .filter(isLikelySkillToken)
    .slice(0, 100);
}

function mergeProjectEntries(existing: ProjectEntry[], next: ProjectEntry[]) {
  const keepExisting = existing.filter((project) => !isProjectEmpty(project));
  if (!keepExisting.length) return next;

  const merged = [...keepExisting];
  for (const project of next) {
    const duplicate = merged.some(
      (entry) =>
        entry.projectTitle.trim() &&
        project.projectTitle.trim() &&
        entry.projectTitle.trim().toLowerCase() === project.projectTitle.trim().toLowerCase()
    );
    if (!duplicate) merged.push(project);
  }
  return merged;
}

function mergeExperienceEntriesPreferRich(existing: ExperienceEntry[], next: ExperienceEntry[]) {
  const byLabel = new Map<string, ExperienceEntry>();
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

  const put = (entry: ExperienceEntry) => {
    const key = normalize(entry.experience);
    if (!key) return;
    const prev = byLabel.get(key);
    if (!prev) {
      byLabel.set(key, entry);
      return;
    }
    byLabel.set(
      key,
      createExperienceEntry({
        id: prev.id,
        experience: prev.experience || entry.experience,
        experienceYears: prev.experienceYears || entry.experienceYears,
        experienceReference: prev.experienceReference || entry.experienceReference,
      })
    );
  };

  existing.filter((item) => !isExperienceEmpty(item)).forEach(put);
  next.filter((item) => !isExperienceEmpty(item)).forEach(put);
  return Array.from(byLabel.values());
}
