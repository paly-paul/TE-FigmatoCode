"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppNavbar from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { LightbulbIcon, TrashIcon } from "@/components/icons";
import { markProfileComplete } from "@/lib/profileOnboarding";
import { getCandidateId, getProfileName, isLikelyDocId, setProfileName } from "@/lib/authSession";
import { readResumeProfile } from "@/lib/profileSession";
import { getCandidateProfileData, saveProfile } from "@/services/profile";
import { CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react";
import { MOBILE_MQ } from "@/lib/mobileViewport";

interface ResumeSkillsData {
  skills?: string[];
  tools?: string[];
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

interface ExperienceEntry {
  id: string;
  experience: string;
  experienceYears: string;
  experienceReference: string;
}

interface ToolEntry {
  id: string;
  tool: string;
  toolYears: string;
  toolReference: string;
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
type ToolFieldErrors = Partial<Record<keyof Omit<ToolEntry, "id">, string>>;
type ProjectFieldErrors = Partial<Record<keyof Omit<ProjectEntry, "id">, string>>;

type FormErrors = {
  skills?: string;
  experiences?: Record<string, ExperienceFieldErrors>;
  tools?: Record<string, ToolFieldErrors>;
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

function createToolEntry(overrides: Partial<Omit<ToolEntry, "id">> & { id?: string } = {}): ToolEntry {
  return {
    id: overrides.id ?? createEntryId("tool"),
    tool: overrides.tool ?? "",
    toolYears: overrides.toolYears ?? "",
    toolReference: overrides.toolReference ?? "",
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

function isToolEmpty(e: ToolEntry) {
  return !e.tool.trim() && !e.toolYears.trim() && !e.toolReference.trim();
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

function SkillsProjectsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lookingForJob, setLookingForJob] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [backendSkillsStatus, setBackendSkillsStatus] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [experiences, setExperiences] = useState<ExperienceEntry[]>(() => [createExperienceEntry()]);
  const [tools, setTools] = useState<ToolEntry[]>(() => [createToolEntry()]);
  const [projects, setProjects] = useState<ProjectEntry[]>(() => [createProjectEntry()]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState({
    keySkills: true,
    experiences: false,
    tools: false,
    projects: false,
  });

  // Backend-only options: suggestedSkills holds key skills returned from the API.
  // The dropdown offers those values, excluding ones already selected in `skills`.
  const suggestedSkillOptions = dedupeSkills([...suggestedSkills]);
  const hiddenAlreadySelectedCount = suggestedSkillOptions.filter((skill) => {
    const normalized = skill.trim().toLowerCase();
    return skills.some((selected) => selected.trim().toLowerCase() === normalized);
  }).length;

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
    if (!entry.experience.trim()) sectionErrors.experience = "Experience is required.";
    if (!entry.experienceYears.trim()) sectionErrors.experienceYears = "Experience years are required.";
    const ref = entry.experienceReference.trim();
    if (ref && !isValidUrl(ref)) {
      sectionErrors.experienceReference = "Enter a valid URL (http/https).";
    }
    return sectionErrors;
  }

  function validateToolEntry(entry: ToolEntry): ToolFieldErrors {
    const sectionErrors: ToolFieldErrors = {};
    if (!entry.tool.trim()) sectionErrors.tool = "Tool is required.";
    if (!entry.toolYears.trim()) sectionErrors.toolYears = "Tool experience years are required.";
    const ref = entry.toolReference.trim();
    if (ref && !isValidUrl(ref)) {
      sectionErrors.toolReference = "Enter a valid URL (http/https).";
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

  function nonEmptyTools() {
    return tools.filter((t) => !isToolEmpty(t));
  }

  function nonEmptyProjects() {
    return projects.filter((p) => !isProjectEmpty(p));
  }

  function isExperiencesSectionComplete() {
    const filled = nonEmptyExperiences();
    if (filled.length === 0) return false;
    return experiences.every((e) => isExperienceEmpty(e) || Object.keys(validateExperienceEntry(e)).length === 0);
  }

  function isToolsSectionComplete() {
    const filled = nonEmptyTools();
    if (filled.length === 0) return false;
    return tools.every((t) => isToolEmpty(t) || Object.keys(validateToolEntry(t)).length === 0);
  }

  function isProjectsSectionComplete() {
    const filled = nonEmptyProjects();
    if (filled.length === 0) return false;
    return projects.every((p) => isProjectEmpty(p) || Object.keys(validateProjectEntry(p)).length === 0);
  }

  const completionPercent = (() => {
    const skillsDone = skills.length > 0;
    const experienceDone = isExperiencesSectionComplete();
    const toolsDone = isToolsSectionComplete();
    const projectsDone = isProjectsSectionComplete();

    let completedSections = 0;
    const totalSections = 4;

    if (skillsDone) completedSections += 1;
    if (experienceDone) completedSections += 1;
    if (toolsDone) completedSections += 1;
    if (projectsDone) completedSections += 1;

    const ratio = Math.min(1, completedSections / totalSections);
    return 40 + ratio * 30;
  })();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem("resumeSkills");
      if (!raw) return;
      const data = JSON.parse(raw) as ResumeSkillsData;
      if (Array.isArray(data.skills) && data.skills.length) {
        setSkills((prev) => dedupeSkills([...prev, ...(data.skills || [])]));
        setSuggestedSkills((prev) => dedupeSkills([...prev, ...(data.skills || [])]));
      }
      if (Array.isArray(data.tools) && data.tools.length) {
        setTools((prev) => mergeToolEntries(prev, data.tools!));
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
  }, []);

  useEffect(() => {
    const storedProfile = readResumeProfile();
    if (!storedProfile) return;

    if (storedProfile.keySkills?.length) {
      setSkills((prev) => dedupeSkills([...prev, ...storedProfile.keySkills!]));
      setSuggestedSkills((prev) => dedupeSkills([...prev, ...storedProfile.keySkills!]));
    }

    if (storedProfile.tools?.length) {
      setTools((prev) => mergeToolEntries(prev, storedProfile.tools!));
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
          const label = [title, company].filter(Boolean).join(" @ ").trim();
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const candidateId = getCandidateId();
        const queryProfileName = searchParams.get("profile_name")?.trim() || "";
        let profileName = queryProfileName || getProfileName();

        if (profileName && !isLikelyDocId(profileName)) {
          profileName = "";
        }

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

        if (!profileName) return;

        if (cancelled) return;

        const generatedSkills = await fetchGeneratedSkillsForProfile(profileName);
        if (cancelled) return;

        const backendProfile = await getCandidateProfileData(profileName);
        if (cancelled) return;

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

            const skillsTable = Array.isArray(version.skills_table) ? version.skills_table : [];
            if (skillsTable.length) {
              setTools((prev) => {
                const hasAny = prev.some((t) => !isToolEmpty(t));
                if (hasAny) return prev;
                const mapped = skillsTable
                  .map((row: any) => {
                    const tool = typeof row?.key_skills === "string" ? row.key_skills.trim() : "";
                    if (!tool) return null;
                    const years =
                      typeof row?.experience === "number"
                        ? String(row.experience)
                        : typeof row?.experience === "string"
                          ? row.experience.trim()
                          : "";
                    const ref = typeof row?.url === "string" ? row.url.trim() : "";
                    return createToolEntry({ tool, toolYears: years, toolReference: ref });
                  })
                  .filter(Boolean) as ToolEntry[];
                return mapped.length ? mapped : prev;
              });
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
              setProjects((prev) => {
                const hasAny = prev.some((p) => !isProjectEmpty(p));
                if (hasAny) return prev;
                const mapped = projectsTable
                  .map((row: any) => {
                    const title = typeof row?.title === "string" ? row.title.trim() : "";
                    const company =
                      (typeof row?.customer_company === "string" ? row.customer_company.trim() : "") ||
                      extractCompanyFromText(row?.roles_responsibilities) ||
                      extractCompanyFromText(row?.description);
                    const start = typeof row?.start_date === "string" ? row.start_date : "";
                    const end = typeof row?.end_date === "string" ? row.end_date : "";
                    const description = typeof row?.description === "string" ? row.description.trim() : "";
                    const resp =
                      typeof row?.roles_responsibilities === "string" ? row.roles_responsibilities.trim() : "";
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
                return mapped.length ? mapped : prev;
              });
            }

            // Prefill "Experience" section from work history / organizations.
            // Prefer backend work_experience if present; otherwise derive from projects_table.
            setExperiences((prev) => {
              const hasAny = prev.some((e) => !isExperienceEmpty(e));
              if (hasAny) return prev;

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
                        const label = [role, company].filter(Boolean).join(" @ ").trim();
                        if (!label) return null;
                        const years = yearsFromRange(row?.from_date ?? row?.start_date, row?.to_date ?? row?.end_date);
                        const ref = typeof row?.url === "string" ? row.url.trim() : "";
                        return createExperienceEntry({ experience: label, experienceYears: years, experienceReference: ref });
                      })
                      .filter(Boolean)
                  : [];

              if (fromWorkExp.length) return fromWorkExp as ExperienceEntry[];

              const fromProjects =
                projectsTable.length
                  ? projectsTable
                      .map((row: any) => {
                        const company = typeof row?.customer_company === "string" ? row.customer_company.trim() : "";
                        const role = parseRoleFromText(row?.roles_responsibilities);
                        const title = typeof row?.title === "string" ? row.title.trim() : "";
                        // Prefer role; fall back to project title.
                        const base = role || title;
                        const label = [base, company].filter(Boolean).join(" @ ").trim();
                        if (!label) return null;
                        const years = yearsFromRange(row?.start_date, row?.end_date);
                        return createExperienceEntry({ experience: label, experienceYears: years, experienceReference: "" });
                      })
                      .filter(Boolean)
                  : [];

              if (!(fromProjects as ExperienceEntry[])?.length) return prev;

              // De-dupe by normalized label.
              const seen = new Set<string>();
              const deduped = (fromProjects as ExperienceEntry[]).filter((entry) => {
                const key = entry.experience.trim().toLowerCase().replace(/\s+/g, " ");
                if (!key) return false;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });

              return deduped.length ? deduped : prev;
            });
          }
        } catch {
          // non-fatal
        }

        const existingSkills = backendProfile.keySkills ?? [];
        const combinedSkills = dedupeSkills([...generatedSkills, ...existingSkills]);

        if (combinedSkills.length) {
          setSuggestedSkills((prev) => dedupeSkills([...combinedSkills, ...prev]));

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
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const first = projects[0];
    const payload: ResumeSkillsData = {
      skills,
      tools: tools.map((tool) => tool.tool.trim()).filter(Boolean),
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
  }, [skills, tools, projects]);

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

  function updateTool(id: string, patch: Partial<Omit<ToolEntry, "id">>) {
    setTools((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setErrors((prev) => {
      const next = { ...prev };
      if (next.tools?.[id]) {
        const fe = { ...next.tools[id] };
        for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
          delete fe[k as keyof ToolFieldErrors];
        }
        next.tools = { ...next.tools, [id]: fe };
        if (Object.keys(next.tools[id]).length === 0) {
          const { [id]: _, ...rest } = next.tools;
          next.tools = Object.keys(rest).length ? rest : undefined;
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

  function handleAddTool() {
    const toolMap: Record<string, ToolFieldErrors> = {};
    for (const t of tools) {
      if (isToolEmpty(t)) continue;
      const fe = validateToolEntry(t);
      if (Object.keys(fe).length) toolMap[t.id] = fe;
    }
    const last = tools[tools.length - 1];
    if (last && isToolEmpty(last)) {
      toolMap[last.id] = validateToolEntry(last);
    }
    if (Object.keys(toolMap).length > 0) {
      setErrors((prev) => ({ ...prev, tools: { ...prev.tools, ...toolMap } }));
      return;
    }
    setTools((prev) => [...prev, createToolEntry()]);
    setErrors((prev) => ({ ...prev, tools: undefined }));
  }

  function handleRemoveTool(id: string) {
    setTools((prev) => {
      const next = prev.filter((t) => t.id !== id);
      return next.length ? next : [createToolEntry()];
    });
    setErrors((prev) => {
      if (!prev.tools?.[id]) return prev;
      const { [id]: _, ...rest } = prev.tools;
      return { ...prev, tools: Object.keys(rest).length ? rest : undefined };
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

    const toolMap: Record<string, ToolFieldErrors> = {};
    const filledTools = nonEmptyTools();
    if (filledTools.length === 0) {
      const only = tools[0];
      if (only) toolMap[only.id] = validateToolEntry(only);
    } else {
      for (const t of tools) {
        if (isToolEmpty(t)) continue;
        const fe = validateToolEntry(t);
        if (Object.keys(fe).length) toolMap[t.id] = fe;
      }
    }
    if (Object.keys(toolMap).length) nextErrors.tools = toolMap;

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
      !nextErrors.tools &&
      !nextErrors.projects
    );
  }

  async function handleFinish() {
    if (!validate()) return;

    const storedProfile = readResumeProfile();
    const queryProfileName = searchParams.get("profile_name")?.trim() || "";
    let profileName = queryProfileName || getProfileName() || "";

    if (profileName && !isLikelyDocId(profileName)) {
      profileName = "";
    }

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

    const keySkills = dedupeSkills([
      ...skills,
      ...tools.map((tool) => tool.tool.trim()).filter(Boolean),
    ]).map((key_skill) => ({ key_skill }));

    const educationDetails =
      storedProfile?.education?.map((entry) => ({
        degree: entry.title?.trim() || undefined,
        institution: entry.institute?.trim() || undefined,
        year: entry.graduationYear?.trim() || undefined,
      })).filter((entry) => entry.degree || entry.institution || entry.year) ?? [];

    const totalExperience = (() => {
      const yearsRaw = storedProfile?.experienceYears?.trim() || "0";
      const years = parseInt(yearsRaw, 10);
      return Number.isFinite(years) && years >= 0 ? years : undefined;
    })();

    const workExperience = nonEmptyProjects()
      .map((project) => ({
        company: project.customerCompany.trim() || undefined,
        role: project.projectTitle.trim() || undefined,
        from_date: project.projectStartDate || undefined,
        to_date: project.inProgress ? undefined : project.projectEndDate || undefined,
      }))
      .filter((entry) => entry.company || entry.role || entry.from_date || entry.to_date);

    const nextProfilePayload = {
      full_name: fullName || undefined,
      email,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      dob: storedProfile?.dob?.trim() || undefined,
      gender: storedProfile?.gender?.trim() || undefined,
      country_code: storedProfile?.countryCode?.trim() || undefined,
      phone: storedProfile?.phone?.trim() || undefined,
      alt_email: storedProfile?.altEmail?.trim() || undefined,
      nationality: storedProfile?.nationality?.trim() || undefined,
      current_location: storedProfile?.currentLocation?.trim() || undefined,
    };

    const nextProfileVersionPayload = {
      professional_title: storedProfile?.professionalTitle?.trim() || undefined,
      experience_years: storedProfile?.experienceYears?.trim() || undefined,
      experience_months: storedProfile?.experienceMonths?.trim() || undefined,
      salary_per_month: storedProfile?.salaryPerMonth?.trim() || undefined,
      salary_currency: storedProfile?.salaryCurrency?.trim() || undefined,
      summary: storedProfile?.summary?.trim() || undefined,
      preferred_location: storedProfile?.preferredLocation?.trim() || undefined,
      key_skills: keySkills.length ? keySkills : undefined,
      work_experience: workExperience.length ? workExperience : undefined,
      education_details: educationDetails.length ? educationDetails : undefined,
      certifications: storedProfile?.certifications?.length
        ? storedProfile.certifications
            .map((entry) => ({
              name: entry.name?.trim() || undefined,
              issuing: entry.issuing?.trim() || undefined,
              certificate_number: entry.certificateNumber?.trim() || undefined,
              issue_date: entry.issueDate?.trim() || undefined,
              expiration_date: entry.expirationDate?.trim() || undefined,
              url: entry.url?.trim() || undefined,
            }))
            .filter((entry) =>
              entry.name ||
              entry.issuing ||
              entry.certificate_number ||
              entry.issue_date ||
              entry.expiration_date ||
              entry.url
            )
        : undefined,
      external_links: storedProfile?.externalLinks?.length
        ? storedProfile.externalLinks
            .map((entry) => ({
              label: entry.label?.trim() || undefined,
              url: entry.url?.trim() || undefined,
            }))
            .filter((entry) => entry.label || entry.url)
        : undefined,
      languages: storedProfile?.languages?.length
        ? storedProfile.languages
            .map((entry) => ({
              language: entry.language?.trim() || undefined,
              read: entry.read?.trim() || undefined,
              write: entry.write?.trim() || undefined,
              speak: entry.speak?.trim() || undefined,
            }))
            .filter((entry) => entry.language || entry.read || entry.write || entry.speak)
        : undefined,
    };

    const existingEnvelope = profileName ? await fetchExistingProfileEnvelope(profileName) : null;
    const mergedProfilePayload = mergeWithExistingObject(
      existingEnvelope?.profile ?? {},
      nextProfilePayload as JsonRecord
    );
    const mergedProfileVersionPayload = mergeWithExistingObject(
      existingEnvelope?.profile_version ?? {},
      nextProfileVersionPayload as JsonRecord
    );

    const mergedKeySkills = mergeKeySkillRows(
      existingEnvelope?.profile_version?.key_skills,
      keySkills.length ? keySkills : undefined
    );
    if (mergedKeySkills) {
      mergedProfileVersionPayload.key_skills = mergedKeySkills;
    }

    const mergedWorkExperience = mergeObjectArrayRows(
      existingEnvelope?.profile_version?.work_experience,
      workExperience.length ? workExperience : undefined
    );
    if (mergedWorkExperience) {
      mergedProfileVersionPayload.work_experience = mergedWorkExperience;
    }

    const mergedEducationDetails = mergeObjectArrayRows(
      existingEnvelope?.profile_version?.education_details,
      educationDetails.length ? educationDetails : undefined
    );
    if (mergedEducationDetails) {
      mergedProfileVersionPayload.education_details = mergedEducationDetails;
    }

    setIsSubmittingProfile(true);
    try {
      const response = await saveProfile({
        profile_name: profileName || undefined,
        full_name: fullName,
        email,
        professional_title: storedProfile?.professionalTitle?.trim() || undefined,
        total_experience: totalExperience,
        current_location: storedProfile?.currentLocation?.trim() || undefined,
        key_skills: keySkills.length ? keySkills : undefined,
        work_experience: workExperience.length ? workExperience : undefined,
        education_details: educationDetails.length ? educationDetails : undefined,
        profile: mergedProfilePayload,
        profile_version: mergedProfileVersionPayload,
        action: "submit",
      });

      const linkedProfileFromServerMessage = extractLinkedProfileIdFromServerMessages(response);
      const messageRoot =
        response.message && typeof response.message === "object"
          ? (response.message as Record<string, unknown>)
          : null;
      const savedProfileName =
        (typeof response.profile_name === "string" && response.profile_name.trim()) ||
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
    router.push("/dashboard");
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

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6]">
      <AppNavbar />

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
                    <span className="text-sm font-medium text-gray-800">Skills</span>
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
                          <p className="text-sm text-gray-600">Experience {idx + 1}</p>
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
                            <span className="text-sm font-medium text-gray-800">Experience</span>
                            <input
                              type="text"
                              value={entry.experience}
                              onChange={(e) => updateExperience(entry.id, { experience: e.target.value })}
                              placeholder="Enter experience"
                              className={fieldClass(Boolean(fe?.experience))}
                            />
                            {fe?.experience && <p className="text-xs text-red-500">{fe.experience}</p>}
                          </label>

                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-800">Exp. in Years</span>
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
                title="Tools"
                expanded={mobileAccordionOpen.tools}
                onToggle={() =>
                  setMobileAccordionOpen((prev) => ({
                    ...prev,
                    tools: !prev.tools,
                  }))
                }
              >
                <div className="p-4 space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-primary-600 font-semibold text-sm hover:text-primary-700"
                      onClick={handleAddTool}
                    >
                      + Add
                    </button>
                  </div>

                  {tools.map((entry, idx) => {
                    const fe = errors.tools?.[entry.id];
                    return (
                      <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">Tool {idx + 1}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveTool(entry.id)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                          >
                            <TrashIcon /> Delete
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-800">Tools</span>
                            <input
                              type="text"
                              value={entry.tool}
                              onChange={(e) => updateTool(entry.id, { tool: e.target.value })}
                              placeholder="Enter tool"
                              className={fieldClass(Boolean(fe?.tool))}
                            />
                            {fe?.tool && <p className="text-xs text-red-500">{fe.tool}</p>}
                          </label>

                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-800">Exp. in Years</span>
                            <input
                              type="number"
                              min={0}
                              value={entry.toolYears}
                              onChange={(e) => updateTool(entry.id, { toolYears: e.target.value })}
                              placeholder="0"
                              className={fieldClass(Boolean(fe?.toolYears))}
                            />
                            {fe?.toolYears && <p className="text-xs text-red-500">{fe.toolYears}</p>}
                          </label>

                          <label className="flex flex-col gap-2 col-span-2">
                            <span className="text-sm font-medium text-gray-800">Reference (Link) (optional)</span>
                            <input
                              type="url"
                              value={entry.toolReference}
                              onChange={(e) => updateTool(entry.id, { toolReference: e.target.value })}
                              placeholder="https://"
                              className={fieldClass(Boolean(fe?.toolReference))}
                            />
                            {fe?.toolReference && (
                              <p className="text-xs text-red-500">{fe.toolReference}</p>
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
                            <span className="text-sm font-medium text-gray-800">Project Title</span>
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
                            <span className="text-sm font-medium text-gray-800">Customer / Company</span>
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
                              <span className="text-sm font-medium text-gray-800">Project Start Date</span>
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
                              <span className="text-sm font-medium text-gray-800">Project End Date</span>
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
                          <span className="text-sm font-medium text-gray-800">Description</span>
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
                          <span className="text-sm font-medium text-gray-800">Responsibilities</span>
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
                  <span className="text-sm font-medium text-gray-800">Skills</span>
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
                        <p className="text-sm text-gray-600">Experience {idx + 1}</p>
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
                          <span className="text-sm font-medium text-gray-800">Experience</span>
                          <input
                            type="text"
                            value={entry.experience}
                            onChange={(e) => updateExperience(entry.id, { experience: e.target.value })}
                            placeholder="Enter experience"
                            className={fieldClass(Boolean(fe?.experience))}
                          />
                          {fe?.experience && <p className="text-xs text-red-500">{fe.experience}</p>}
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Exp. in Years</span>
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
                <h3 className="text-xl font-semibold text-gray-900">Tools</h3>
                <button
                  type="button"
                  className="text-primary-600 font-semibold text-sm hover:text-primary-700"
                  onClick={handleAddTool}
                >
                  + Add
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {tools.map((entry, idx) => {
                  const fe = errors.tools?.[entry.id];
                  return (
                    <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Tool {idx + 1}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveTool(entry.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
                        >
                          <TrashIcon /> Delete
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_1.6fr] gap-3">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Tools</span>
                          <input
                            type="text"
                            value={entry.tool}
                            onChange={(e) => updateTool(entry.id, { tool: e.target.value })}
                            placeholder="Enter tool"
                            className={fieldClass(Boolean(fe?.tool))}
                          />
                          {fe?.tool && <p className="text-xs text-red-500">{fe.tool}</p>}
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Exp. in Years</span>
                          <input
                            type="number"
                            min={0}
                            value={entry.toolYears}
                            onChange={(e) => updateTool(entry.id, { toolYears: e.target.value })}
                            placeholder="0"
                            className={fieldClass(Boolean(fe?.toolYears))}
                          />
                          {fe?.toolYears && <p className="text-xs text-red-500">{fe.toolYears}</p>}
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Reference (Link) (optional)</span>
                          <input
                            type="url"
                            value={entry.toolReference}
                            onChange={(e) => updateTool(entry.id, { toolReference: e.target.value })}
                            placeholder="https://"
                            className={fieldClass(Boolean(fe?.toolReference))}
                          />
                          {fe?.toolReference && <p className="text-xs text-red-500">{fe.toolReference}</p>}
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
                          <span className="text-sm font-medium text-gray-800">Project Title</span>
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
                          <span className="text-sm font-medium text-gray-800">Customer / Company</span>
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
                          <span className="text-sm font-medium text-gray-800">Project Start Date</span>
                          <input
                            type="date"
                            value={entry.projectStartDate}
                            onChange={(e) => updateProject(entry.id, { projectStartDate: e.target.value })}
                            className={fieldClass(Boolean(fe?.projectStartDate))}
                          />
                          {fe?.projectStartDate && <p className="text-xs text-red-500">{fe.projectStartDate}</p>}
                        </label>

                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-800">Project End Date</span>
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
                        <span className="text-sm font-medium text-gray-800">Description</span>
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
                        <span className="text-sm font-medium text-gray-800">Responsibilities</span>
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
                <h3 className="text-xl font-semibold text-gray-900">Resume submitted successfully!</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Your profile has been updated with all the key details from your resume.
                </p>
              </div>

              <div className="mx-auto mt-5 flex max-w-[420px] items-center justify-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-primary-600" />
                <span>Profile Version V1.0 created!</span>
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
    const profile =
      root && typeof root === "object" && !Array.isArray(root)
        ? (root as JsonRecord)
        : undefined;
    const profileVersion =
      profile?.profile_version && typeof profile.profile_version === "object" && !Array.isArray(profile.profile_version)
        ? (profile.profile_version as JsonRecord)
        : undefined;
    return { profile, profile_version: profileVersion };
  } catch {
    return null;
  }
}

function mergeWithExistingObject(existing: JsonRecord, next: JsonRecord): JsonRecord {
  const merged: JsonRecord = { ...existing, ...next };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === null || value === "") {
      if (existing[key] !== undefined) {
        merged[key] = existing[key];
      } else {
        delete merged[key];
      }
    }
  }
  return merged;
}

function mergeObjectArrayRows(existing: unknown, next: unknown): JsonRecord[] | undefined {
  const normalize = (rows: unknown): JsonRecord[] =>
    Array.isArray(rows)
      ? rows
          .filter((row) => row && typeof row === "object" && !Array.isArray(row))
          .map((row) => row as JsonRecord)
      : [];

  const existingRows = normalize(existing);
  const nextRows = normalize(next);
  if (!existingRows.length && !nextRows.length) return undefined;

  const seen = new Set<string>();
  const merged: JsonRecord[] = [];
  for (const row of [...existingRows, ...nextRows]) {
    const signature = JSON.stringify(row);
    if (seen.has(signature)) continue;
    seen.add(signature);
    merged.push(row);
  }
  return merged.length ? merged : undefined;
}

function mergeKeySkillRows(existing: unknown, next: unknown): Array<{ key_skill: string }> | undefined {
  const extract = (rows: unknown): string[] =>
    Array.isArray(rows)
      ? rows
          .map((row) => {
            if (!row || typeof row !== "object") return "";
            const value = (row as { key_skill?: unknown }).key_skill;
            return typeof value === "string" ? value.trim() : "";
          })
          .filter(Boolean)
      : [];

  const merged = dedupeSkills([...extract(existing), ...extract(next)]);
  return merged.length ? merged.map((key_skill) => ({ key_skill })) : undefined;
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

function isLikelySkillToken(value: string): boolean {
  const token = value.trim();
  const normalized = token.toLowerCase().replace(/\s+/g, " ");
  if (!token) return false;
  if (token.length < 2 || token.length > 50) return false;
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
  if (/^no key skills/i.test(token)) return false;
  if (/^status$/i.test(token)) return false;
  if (/^success$/i.test(token)) return false;
  if (/^failed$/i.test(token)) return false;
  if (/^profile$/i.test(token)) return false;
  return true;
}

async function fetchGeneratedSkillsForProfile(profileName: string): Promise<string[]> {
  const url = `/api/method/generate_keyskills_for_profile?profile_name=${encodeURIComponent(profileName)}`;
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
  const status =
    typeof messageNode?.status === "string"
      ? messageNode.status.toLowerCase()
      : typeof record.status === "string"
        ? record.status.toLowerCase()
        : "";
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

  const fromRootData = collectSkillStringsFromUnknown(record.data);
  const fromMessageData = collectSkillStringsFromUnknown(messageNode?.data);
  const fromRootSkills = collectSkillStringsFromUnknown(record.key_skills ?? record.skills);

  return dedupeSkills([...fromRootData, ...fromMessageData, ...fromRootSkills])
    .filter(isLikelySkillToken)
    .slice(0, 100);
}

function mergeToolEntries(existing: ToolEntry[], toolNames: string[]) {
  const existingNames = new Set(existing.map((tool) => tool.tool.trim().toLowerCase()).filter(Boolean));
  const additions = toolNames
    .filter((tool) => tool.trim())
    .filter((tool) => !existingNames.has(tool.trim().toLowerCase()))
    .map((tool) => createToolEntry({ tool }));

  if (!additions.length) return existing;
  const keepExisting = existing.filter((tool) => !isToolEmpty(tool));
  return [...keepExisting, ...additions];
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
