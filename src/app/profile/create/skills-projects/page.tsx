"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { LightbulbIcon, TrashIcon } from "@/components/icons";
import { markProfileComplete } from "@/lib/profileOnboarding";
import { CheckCircle2, X } from "lucide-react";

interface ResumeSkillsData {
  skills?: string[];
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

const SKILL_OPTIONS = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Express",
  "MongoDB",
  "PostgreSQL",
  "AWS",
  "Docker",
];

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

export default function SkillsProjectsPage() {
  const router = useRouter();
  const [lookingForJob, setLookingForJob] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [experiences, setExperiences] = useState<ExperienceEntry[]>(() => [createExperienceEntry()]);
  const [tools, setTools] = useState<ToolEntry[]>(() => [createToolEntry()]);
  const [projects, setProjects] = useState<ProjectEntry[]>(() => [createProjectEntry()]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

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
    if (!ref) {
      sectionErrors.experienceReference = "Reference link is required.";
    } else if (!isValidUrl(ref)) {
      sectionErrors.experienceReference = "Enter a valid URL (http/https).";
    }
    return sectionErrors;
  }

  function validateToolEntry(entry: ToolEntry): ToolFieldErrors {
    const sectionErrors: ToolFieldErrors = {};
    if (!entry.tool.trim()) sectionErrors.tool = "Tool is required.";
    if (!entry.toolYears.trim()) sectionErrors.toolYears = "Tool experience years are required.";
    const ref = entry.toolReference.trim();
    if (!ref) {
      sectionErrors.toolReference = "Reference link is required.";
    } else if (!isValidUrl(ref)) {
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
      if (Array.isArray(data.skills)) setSkills(data.skills);
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
    } catch {
      // ignore invalid JSON
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const first = projects[0];
    const payload: ResumeSkillsData = {
      skills,
      projectDescription: first?.projectDescription ?? "",
      responsibilities: first?.responsibilities ?? "",
    };
    try {
      window.sessionStorage.setItem("resumeSkills", JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [skills, projects]);

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

  function handleFinish() {
    if (!validate()) return;
    markProfileComplete();
    setIsFinishModalOpen(true);
  }

  function handleContinueToDashboard() {
    setIsFinishModalOpen(false);
    router.push("/dashboard");
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
                    {SKILL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">Select multiple skills from the dropdown list.</p>
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
                          <span className="text-sm font-medium text-gray-800">Reference (Link)</span>
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
                          <span className="text-sm font-medium text-gray-800">Reference (Link)</span>
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
        <Button fullWidth={false} className="px-6 sm:px-8" onClick={handleFinish}>
          Finish
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
