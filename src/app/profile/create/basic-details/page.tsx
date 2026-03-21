"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { SmallUploadIcon } from "@/components/icons";

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
}

type FormErrors = Partial<Record<keyof BasicDetailsForm, string>>;

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
};

const fieldClass = (hasError: boolean) =>
  `w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 ${
    hasError ? "border-red-400" : "border-gray-300"
  }`;

export default function BasicDetailsPage() {
  const router = useRouter();
  const [lookingForJob, setLookingForJob] = useState(true);
  const [form, setForm] = useState<BasicDetailsForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});

  // Section-level completion (not per character)
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

    const contactDigits = form.contact.replace(/\D/g, "");
    if (!form.contact.trim()) return false;
    if (contactDigits.length < 7 || contactDigits.length > 15) return false;

    return true;
  })();

  const completionPercent = (() => {
    let completedSections = 0;
    const totalSections = 2;

    if (isProfessionalSectionComplete) completedSections += 1;
    if (isPersonalSectionComplete) completedSections += 1;

    const ratio = Math.min(1, completedSections / totalSections);
    // Step 1 contributes 10%, this step contributes up to +30% (total 40%)
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

    const contactDigits = form.contact.replace(/\D/g, "");
    if (!form.contact.trim()) {
      nextErrors.contact = "Contact number is required.";
    } else if (contactDigits.length < 7 || contactDigits.length > 15) {
      nextErrors.contact = "Enter a valid contact number.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    router.push("/profile/create/skills-projects");
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
          <ProfileStepper currentStep={2} />

          <div className="flex-1 min-w-0">
            <section className="bg-white border border-gray-200 rounded-xl">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Basic Details</h2>
              </div>

              <div className="p-4 sm:p-6 space-y-5">
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
                    <span className="text-sm font-medium text-gray-800">Exp. Months</span>
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

                <div className="border-t border-gray-200 pt-5">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <span className="text-sm font-semibold text-gray-900">Summary</span>
                    <button
                      type="button"
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
                  <div className="w-14 h-14 border border-gray-300 rounded-md bg-white flex items-center justify-center text-primary-600 text-2xl">
                    <span aria-hidden="true">&#9787;</span>
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
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
    </div>
  );
}
