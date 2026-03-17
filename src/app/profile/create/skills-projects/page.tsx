"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { LightbulbIcon, TrashIcon } from "@/components/icons";

interface ResumeSkillsData {
  skills?: string[];
  projectDescription?: string;
  responsibilities?: string;
}

interface SkillsProjectsForm {
  experience: string;
  experienceYears: string;
  experienceReference: string;
  tool: string;
  toolYears: string;
  toolReference: string;
  projectTitle: string;
  customerCompany: string;
  projectStartDate: string;
  projectEndDate: string;
  projectDescription: string;
  responsibilities: string;
}

type FormErrors = Partial<Record<keyof SkillsProjectsForm | "skills", string>>;

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

const initialForm: SkillsProjectsForm = {
  experience: "",
  experienceYears: "",
  experienceReference: "",
  tool: "",
  toolYears: "",
  toolReference: "",
  projectTitle: "",
  customerCompany: "",
  projectStartDate: "",
  projectEndDate: "",
  projectDescription: "",
  responsibilities: "",
};

const fieldClass = (hasError: boolean) =>
  `w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 ${
    hasError ? "border-red-400" : "border-gray-300"
  }`;

export default function SkillsProjectsPage() {
  const router = useRouter();
  const [lookingForJob, setLookingForJob] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [form, setForm] = useState<SkillsProjectsForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasExperienceEntry, setHasExperienceEntry] = useState(false);
  const [hasToolEntry, setHasToolEntry] = useState(false);
  const [hasProjectEntry, setHasProjectEntry] = useState(false);

  const completionPercent = (() => {
    // Section-based completion:
    // 1) Skills, 2) Experience, 3) Tools, 4) Projects

    const isSkillsSectionComplete = skills.length > 0;

    const isExperienceSectionComplete = (() => {
      if (!hasExperienceEntry) return false;
      if (!form.experience.trim()) return false;
      if (!form.experienceYears.trim()) return false;
      const ref = form.experienceReference.trim();
      if (!ref || !isValidUrl(ref)) return false;
      return true;
    })();

    const isToolsSectionComplete = (() => {
      if (!hasToolEntry) return false;
      if (!form.tool.trim()) return false;
      if (!form.toolYears.trim()) return false;
      const ref = form.toolReference.trim();
      if (!ref || !isValidUrl(ref)) return false;
      return true;
    })();

    const isProjectsSectionComplete = (() => {
      if (!hasProjectEntry) return false;
      if (!form.projectTitle.trim()) return false;
      if (!form.customerCompany.trim()) return false;
      if (!form.projectStartDate) return false;
      if (!form.projectEndDate) return false;

      const start = new Date(form.projectStartDate);
      const end = new Date(form.projectEndDate);
      if (end < start) return false;

      const descLen = form.projectDescription.trim().length;
      if (descLen < 30) return false;

      const respLen = form.responsibilities.trim().length;
      if (respLen < 20) return false;

      return true;
    })();

    let completedSections = 0;
    const totalSections = 4;

    if (isSkillsSectionComplete) completedSections += 1;
    if (isExperienceSectionComplete) completedSections += 1;
    if (isToolsSectionComplete) completedSections += 1;
    if (isProjectsSectionComplete) completedSections += 1;

    const ratio = Math.min(1, completedSections / totalSections);
    // Steps 1+2 contribute 40%, this step contributes up to +30% (total 70%)
    return 40 + ratio * 30;
  })();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem("resumeSkills");
      if (!raw) return;
      const data = JSON.parse(raw) as ResumeSkillsData;
      if (Array.isArray(data.skills)) setSkills(data.skills);
      setForm((prev) => ({
        ...prev,
        projectDescription: typeof data.projectDescription === "string" ? data.projectDescription : prev.projectDescription,
        responsibilities: typeof data.responsibilities === "string" ? data.responsibilities : prev.responsibilities,
      }));
    } catch {
      // ignore invalid JSON
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: ResumeSkillsData = {
      skills,
      projectDescription: form.projectDescription,
      responsibilities: form.responsibilities,
    };
    try {
      window.sessionStorage.setItem("resumeSkills", JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [skills, form.projectDescription, form.responsibilities]);

  function setField<K extends keyof SkillsProjectsForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
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
    const sectionErrors: FormErrors = {};

    if (!form.experience.trim()) sectionErrors.experience = "Experience is required.";
    if (!form.experienceYears.trim()) sectionErrors.experienceYears = "Experience years are required.";
    if (!form.experienceReference.trim()) {
      sectionErrors.experienceReference = "Reference link is required.";
    } else if (!isValidUrl(form.experienceReference.trim())) {
      sectionErrors.experienceReference = "Enter a valid URL (http/https).";
    }

    if (Object.keys(sectionErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...sectionErrors }));
      return;
    }

    setHasExperienceEntry(true);
    setErrors((prev) => ({
      ...prev,
      experience: undefined,
      experienceYears: undefined,
      experienceReference: undefined,
    }));
  }

  function handleAddTool() {
    const sectionErrors: FormErrors = {};

    if (!form.tool.trim()) sectionErrors.tool = "Tool is required.";
    if (!form.toolYears.trim()) sectionErrors.toolYears = "Tool experience years are required.";
    if (!form.toolReference.trim()) {
      sectionErrors.toolReference = "Reference link is required.";
    } else if (!isValidUrl(form.toolReference.trim())) {
      sectionErrors.toolReference = "Enter a valid URL (http/https).";
    }

    if (Object.keys(sectionErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...sectionErrors }));
      return;
    }

    setHasToolEntry(true);
    setErrors((prev) => ({
      ...prev,
      tool: undefined,
      toolYears: undefined,
      toolReference: undefined,
    }));
  }

  function handleAddProject() {
    const sectionErrors: FormErrors = {};

    if (!form.projectTitle.trim()) sectionErrors.projectTitle = "Project title is required.";
    if (!form.customerCompany.trim()) sectionErrors.customerCompany = "Customer/company is required.";
    if (!form.projectStartDate) sectionErrors.projectStartDate = "Start date is required.";
    if (!form.projectEndDate) sectionErrors.projectEndDate = "End date is required.";

    if (form.projectStartDate && form.projectEndDate) {
      const start = new Date(form.projectStartDate);
      const end = new Date(form.projectEndDate);
      if (end < start) sectionErrors.projectEndDate = "End date cannot be before start date.";
    }

    if (!form.projectDescription.trim()) {
      sectionErrors.projectDescription = "Project description is required.";
    } else if (form.projectDescription.trim().length < 30) {
      sectionErrors.projectDescription = "Description should be at least 30 characters.";
    }

    if (!form.responsibilities.trim()) {
      sectionErrors.responsibilities = "Responsibilities are required.";
    } else if (form.responsibilities.trim().length < 20) {
      sectionErrors.responsibilities = "Responsibilities should be at least 20 characters.";
    }

    if (Object.keys(sectionErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...sectionErrors }));
      return;
    }

    setHasProjectEntry(true);
    setErrors((prev) => ({
      ...prev,
      projectTitle: undefined,
      customerCompany: undefined,
      projectStartDate: undefined,
      projectEndDate: undefined,
      projectDescription: undefined,
      responsibilities: undefined,
    }));
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (skills.length === 0) nextErrors.skills = "Please add at least one skill.";

    if (!hasExperienceEntry) {
      nextErrors.experience = "Please add at least one experience using '+ Add'.";
    }

    if (!hasToolEntry) {
      nextErrors.tool = "Please add at least one tool using '+ Add'.";
    }

    if (!hasProjectEntry) {
      nextErrors.projectTitle = "Please add at least one project using '+ Add'.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleFinish() {
    if (!validate()) return;
    alert("Profile created successfully.");
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
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_1.6fr] gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Experience</span>
                    <input
                      type="text"
                      value={form.experience}
                      onChange={(e) => setField("experience", e.target.value)}
                      placeholder="Enter experience"
                      className={fieldClass(Boolean(errors.experience))}
                    />
                    {errors.experience && <p className="text-xs text-red-500">{errors.experience}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Exp. in Years</span>
                    <input
                      type="number"
                      min={0}
                      value={form.experienceYears}
                      onChange={(e) => setField("experienceYears", e.target.value)}
                      placeholder="0"
                      className={fieldClass(Boolean(errors.experienceYears))}
                    />
                    {errors.experienceYears && <p className="text-xs text-red-500">{errors.experienceYears}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Reference (Link)</span>
                    <input
                      type="url"
                      value={form.experienceReference}
                      onChange={(e) => setField("experienceReference", e.target.value)}
                      placeholder="https://"
                      className={fieldClass(Boolean(errors.experienceReference))}
                    />
                    {errors.experienceReference && <p className="text-xs text-red-500">{errors.experienceReference}</p>}
                  </label>
                </div>

                <div className="flex justify-end">
                  <button type="button" className="inline-flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-800 bg-white hover:bg-gray-50">
                    <TrashIcon />
                    Delete
                  </button>
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_1.6fr] gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Tools</span>
                    <input
                      type="text"
                      value={form.tool}
                      onChange={(e) => setField("tool", e.target.value)}
                      placeholder="Enter tool"
                      className={fieldClass(Boolean(errors.tool))}
                    />
                    {errors.tool && <p className="text-xs text-red-500">{errors.tool}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Exp. in Years</span>
                    <input
                      type="number"
                      min={0}
                      value={form.toolYears}
                      onChange={(e) => setField("toolYears", e.target.value)}
                      placeholder="0"
                      className={fieldClass(Boolean(errors.toolYears))}
                    />
                    {errors.toolYears && <p className="text-xs text-red-500">{errors.toolYears}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Reference (Link)</span>
                    <input
                      type="url"
                      value={form.toolReference}
                      onChange={(e) => setField("toolReference", e.target.value)}
                      placeholder="https://"
                      className={fieldClass(Boolean(errors.toolReference))}
                    />
                    {errors.toolReference && <p className="text-xs text-red-500">{errors.toolReference}</p>}
                  </label>
                </div>

                <div className="flex justify-end">
                  <button type="button" className="inline-flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-800 bg-white hover:bg-gray-50">
                    <TrashIcon />
                    Delete
                  </button>
                </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Project Title</span>
                    <input
                      type="text"
                      value={form.projectTitle}
                      onChange={(e) => setField("projectTitle", e.target.value)}
                      placeholder="Enter project title"
                      className={fieldClass(Boolean(errors.projectTitle))}
                    />
                    {errors.projectTitle && <p className="text-xs text-red-500">{errors.projectTitle}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Customer / Company</span>
                    <input
                      type="text"
                      value={form.customerCompany}
                      onChange={(e) => setField("customerCompany", e.target.value)}
                      placeholder="Enter customer or company"
                      className={fieldClass(Boolean(errors.customerCompany))}
                    />
                    {errors.customerCompany && <p className="text-xs text-red-500">{errors.customerCompany}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Project Start Date</span>
                    <input
                      type="date"
                      value={form.projectStartDate}
                      onChange={(e) => setField("projectStartDate", e.target.value)}
                      className={fieldClass(Boolean(errors.projectStartDate))}
                    />
                    {errors.projectStartDate && <p className="text-xs text-red-500">{errors.projectStartDate}</p>}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-800">Project End Date</span>
                    <input
                      type="date"
                      value={form.projectEndDate}
                      onChange={(e) => setField("projectEndDate", e.target.value)}
                      className={fieldClass(Boolean(errors.projectEndDate))}
                    />
                    {errors.projectEndDate && <p className="text-xs text-red-500">{errors.projectEndDate}</p>}
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-800">Description</span>
                  <textarea
                    value={form.projectDescription}
                    onChange={(e) => setField("projectDescription", e.target.value)}
                    maxLength={300}
                    rows={5}
                    placeholder="Describe the project"
                    className={`${fieldClass(Boolean(errors.projectDescription))} leading-6 resize-y`}
                  />
                  <div className="flex items-center justify-between">
                    {errors.projectDescription ? <p className="text-xs text-red-500">{errors.projectDescription}</p> : <span />}
                    <p className="text-xs text-gray-500">{form.projectDescription.length} / 300</p>
                  </div>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-800">Responsibilities</span>
                  <textarea
                    value={form.responsibilities}
                    onChange={(e) => setField("responsibilities", e.target.value)}
                    maxLength={300}
                    rows={5}
                    placeholder="List your key responsibilities"
                    className={`${fieldClass(Boolean(errors.responsibilities))} leading-6 resize-y`}
                  />
                  <div className="flex items-center justify-between">
                    {errors.responsibilities ? <p className="text-xs text-red-500">{errors.responsibilities}</p> : <span />}
                    <p className="text-xs text-gray-500">{form.responsibilities.length} / 300</p>
                  </div>
                </label>

                <div className="flex justify-end">
                  <button type="button" className="inline-flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-800 bg-white hover:bg-gray-50">
                    <TrashIcon />
                    Delete
                  </button>
                </div>
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
    </div>
  );
}






