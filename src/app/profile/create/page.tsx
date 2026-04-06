"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { ResumeUploadArea } from "@/components/profile/ResumeUploadArea";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { LightbulbIcon, UploadBoxIcon, SmallUploadIcon } from "@/components/icons";
import { upsertResumeProfile, clearResumeProfile } from "@/lib/profileSession";
import { setCandidateId, setProfileName } from "@/lib/authSession";
import { MOBILE_MQ } from "@/lib/mobileViewport";
import { uploadProfileFile } from "@/services/profile";
import { ResumeProfileData } from "@/types/profile";

interface UploadedFile {
  name: string;
  uploadDate: string;
}

type GeneratedResumeProfileData = ResumeProfileData & {
  profileName?: string;
  profileVersionName?: string;
  preProfileName?: string;
};

function preferResumeData(
  parsedFromResume: ResumeProfileData,
  generatedFromBackend: ResumeProfileData,
  baseData: ResumeProfileData
): ResumeProfileData {
  const preferredParsed = {
    ...(Object.keys(parsedFromResume).length ? parsedFromResume : {}),
  };

  const merged: ResumeProfileData = {
    ...baseData,
    ...generatedFromBackend,
    ...preferredParsed,
  };

  if (parsedFromResume.keySkills?.length) merged.keySkills = parsedFromResume.keySkills;
  else if (generatedFromBackend.keySkills?.length) merged.keySkills = generatedFromBackend.keySkills;

  if (parsedFromResume.tools?.length) merged.tools = parsedFromResume.tools;
  else if (generatedFromBackend.tools?.length) merged.tools = generatedFromBackend.tools;

  if (parsedFromResume.projects?.length) merged.projects = parsedFromResume.projects;
  else if (generatedFromBackend.projects?.length) merged.projects = generatedFromBackend.projects;

  if (parsedFromResume.education?.length) merged.education = parsedFromResume.education;
  else if (generatedFromBackend.education?.length) merged.education = generatedFromBackend.education;

  return merged;
}

export default function CreateProfilePage() {
  const router = useRouter();
  const [lookingForJob, setLookingForJob] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  // Keep initial render identical to server HTML to avoid hydration mismatch.
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  // Re-hydrate uploaded resume info when the user navigates back
  // to this page within the same session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem("uploadedResumeMeta");
      if (!raw) return;
      const parsed = JSON.parse(raw) as UploadedFile;
      if (parsed?.name && parsed?.uploadDate) {
        setUploadedFile(parsed);
      }
    } catch {
      // ignore invalid JSON
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function formatDate(date: Date) {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }

  async function handleUpload(file: File) {
    const meta: UploadedFile = {
      name: file.name,
      uploadDate: formatDate(new Date()),
    };
    const baseData = deriveFallbackResumeData(file.name);

    function readCookie(cookieName: string): string | null {
      if (typeof document === "undefined") return null;
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
      return match?.[1] ? decodeURIComponent(match[1]).trim() : null;
    }

    let parsedFromResume: ResumeProfileData = {};
    let generatedFromBackend: GeneratedResumeProfileData = {};
    try {
      const formData = new FormData();
      formData.append("file", file);
      console.log("Sending file to /api/parse-resume:", file.name);

      const response = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        parsedFromResume = (await response.json()) as ResumeProfileData;
        console.log("Parsed resume data:", parsedFromResume);
        console.log("Fields extracted:", Object.keys(parsedFromResume));
      } else {
        const errorText = await response.text();
        console.error("Parse resume failed:", response.status, errorText);
      }
    } catch (err) {
      // Keep filename-based fallback only
      console.log("Parse resume error:", err)
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Provide identity explicitly so backend doesn't fall back to "Guest".
      const email = readCookie("user_id") || parsedFromResume.email || "";
      const parsedFullName = [parsedFromResume.firstName, parsedFromResume.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const fullName = readCookie("full_name") || parsedFullName;
      const phoneNumber = (() => {
        const phone = parsedFromResume.phone?.trim() || "";
        const countryCode = parsedFromResume.countryCode?.trim() || "";
        if (!phone) return "";
        if (countryCode) return `${countryCode}${phone.replace(/\s+/g, "")}`;
        return /^\+\d{7,15}$/.test(phone.replace(/\s+/g, "")) ? phone.replace(/\s+/g, "") : "";
      })();
      const currentLocation = parsedFromResume.currentLocation || "";
      if (email) formData.append("email", email);
      if (fullName) formData.append("full_name", fullName);
      if (parsedFromResume.firstName) formData.append("first_name", parsedFromResume.firstName);
      if (parsedFromResume.lastName) formData.append("last_name", parsedFromResume.lastName);
      if (phoneNumber) formData.append("phone_number", phoneNumber);
      if (currentLocation) formData.append("current_location", currentLocation);
      console.log("Sending file to /api/method/generate_profile_from_resume:", file.name);
      console.log("Generate profile identity:", {
        cookieEmail: readCookie("user_id"),
        cookieFullName: readCookie("full_name"),
        parsedEmail: parsedFromResume.email,
        parsedFullName,
        effectiveEmail: email,
        effectiveFullName: fullName,
        phoneNumber,
        currentLocation,
      });

      const response = await fetch("/api/method/generate_profile_from_resume/", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        generatedFromBackend = (await response.json()) as GeneratedResumeProfileData;
        console.log("Generated backend profile data:", generatedFromBackend);
      } else {
        const errorText = await response.text();
        console.error("Generate profile from resume failed:", response.status, errorText);
      }
    } catch (err) {
      console.log("Generate profile from resume error:", err);
    }

    const hasMeaningfulBackendData =
      Boolean(generatedFromBackend.firstName) ||
      Boolean(generatedFromBackend.lastName) ||
      Boolean(generatedFromBackend.email) ||
      Boolean(generatedFromBackend.phone) ||
      Boolean(generatedFromBackend.professionalTitle) ||
      Boolean(generatedFromBackend.experienceYears) ||
      Boolean(generatedFromBackend.currentLocation) ||
      Boolean(generatedFromBackend.keySkills?.length) ||
      Boolean(generatedFromBackend.education?.length);

    const hasMeaningfulParsedData =
      Boolean(parsedFromResume.firstName) ||
      Boolean(parsedFromResume.lastName) ||
      Boolean(parsedFromResume.email) ||
      Boolean(parsedFromResume.phone) ||
      Boolean(parsedFromResume.professionalTitle) ||
      Boolean(parsedFromResume.summary);

    const mergedData: ResumeProfileData = hasMeaningfulBackendData
      ? preferResumeData(
          hasMeaningfulParsedData ? parsedFromResume : { ...baseData, ...parsedFromResume },
          generatedFromBackend,
          baseData
        )
      : hasMeaningfulParsedData
        ? parsedFromResume
        : { ...baseData, ...parsedFromResume };

    console.log("Storing in session:", mergedData);
    upsertResumeProfile(mergedData)

    if (generatedFromBackend.profileName) {
      setProfileName(generatedFromBackend.profileName);
    }

    if (typeof window !== "undefined") {
      try {
        const firstProject = mergedData.projects?.[0];
        window.sessionStorage.setItem(
          "resumeSkills",
          JSON.stringify({
            skills: mergedData.keySkills ?? [],
            tools: mergedData.tools ?? [],
            projects: mergedData.projects ?? [],
            projectDescription: firstProject?.projectDescription ?? "",
            responsibilities: firstProject?.responsibilities ?? "",
          })
        );
      } catch {
        // ignore storage errors
      }
    }

    try {
      await uploadProfileFile(file);
    } catch {
      // Resume text is already merged into session; upload can be retried later.
    }

    setUploadedFile(meta);

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          "uploadedResumeMeta",
          JSON.stringify(meta)
        );
      } catch {
        // ignore storage errors
      }
    }
  }

  function handleDelete() {
    setUploadedFile(null);
    clearResumeProfile();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("uploadedResumeMeta");
        window.sessionStorage.removeItem("resumeSkills");
        window.sessionStorage.removeItem("resumeProfilePic");
      } catch {
        // ignore storage errors
      }
    }
  }

  function handleNext() {
    if (!uploadedFile) {
      alert("Please upload your resume before continuing.");
      return;
    }

    router.push("/profile/create/basic-details");
  }

  function deriveFallbackResumeData(fileName: string): ResumeProfileData {
    const baseData: ResumeProfileData = {};
    const ignoredTokens = new Set(["resume", "cv", "profile", "updated", "final", "draft", "new"]);
    const nameFromFile = fileName.replace(/\.[^/.]+$/, "");
    const parts = nameFromFile
      .split(/[\s_-]+/)
      .filter(Boolean)
      .filter((token) => /^[A-Za-z.'-]+$/.test(token))
      .filter((token) => !ignoredTokens.has(token.toLowerCase()));

    if (parts.length >= 2) {
      baseData.firstName = parts[0];
      baseData.lastName = parts.slice(1).join(" ");
    }

    return baseData;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6]">
      <AppNavbar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {isMobileViewport ? (
          <div className="flex flex-col flex-1 px-4 pb-28 pt-4 overflow-y-auto gap-4">
            <MobileUploadStepper />
            <ProfileProgressCard percent={uploadedFile ? 10 : 0} className="w-full" />

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-3xl font-semibold text-gray-900 leading-none">Upload Resume</h2>
              </div>
              <div className="p-3">
                <MobileResumeUploadCard
                  uploadedFile={uploadedFile}
                  onUpload={handleUpload}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#F0F6FF] border border-blue-100 rounded px-4 py-3">
              <span className="shrink-0 mt-0.5">
                <LightbulbIcon />
              </span>
              <p className="text-sm text-gray-700 leading-snug">
                Upload your resume to auto-fill skills and projects. You can edit
                them in the next steps.
              </p>
            </div>
          </div>
        ) : (
          <>
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
              <ProfileStepper currentStep={1} />

            <div className="order-3 xl:order-2 flex flex-col flex-1 gap-4 min-w-0">
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Upload Resume</h2>
                  <ResumeUploadArea
                    uploadedFile={uploadedFile}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                  />
                </div>

                {!uploadedFile && (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <span className="shrink-0 mt-0.5">
                      <LightbulbIcon />
                    </span>
                    <p className="text-sm text-gray-600">
                      Upload your resume to auto-fill skills and projects. You can edit
                      them in the next steps.
                    </p>
                  </div>
                )}
              </div>

              <ProfileProgressCard percent={uploadedFile ? 10 : 0} className="order-2 xl:order-3" />
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex justify-end gap-3">
        <Button
          variant="outline"
          fullWidth={false}
          onClick={() => router.back()}
          className="px-6 sm:px-8"
        >
          Previous
        </Button>
        <Button fullWidth={false} onClick={handleNext} className="px-6 sm:px-8">
          Next
        </Button>
      </div>
    </div>
  );
}

function MobileUploadStepper() {
  const steps = [1, 2, 3];
  return (
    <div className="flex items-center gap-3">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 1
              ? "bg-primary-600 text-white"
              : "bg-transparent border border-[#A7B2C8] text-[#6B7A99]"
              }`}
          >
            {step}
          </div>
          {step === 1 ? (
            <span className="text-2xl font-semibold text-gray-900">Upload Resume</span>
          ) : null}
          {idx < steps.length - 1 ? <span className="text-gray-400">|</span> : null}
        </div>
      ))}
    </div>
  );
}

function MobileResumeUploadCard({
  uploadedFile,
  onUpload,
}: {
  uploadedFile: UploadedFile | null;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      alert("Only PDF or DOCX files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5 MB.");
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch {
      alert("We couldn't upload that resume. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded border border-[#CFD7E7] bg-[#EFF3FA] p-6 flex flex-col items-center text-center gap-3 min-h-[220px] justify-center">
      <UploadBoxIcon />
      <p className="text-2xl font-medium text-gray-900 leading-none">
        {uploadedFile ? uploadedFile.name : "No file selected"}
      </p>
      <p className="text-sm text-[#60708F]">Supports PDF, Docx files upto 5 MB</p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="mt-1 flex items-center gap-2 border border-[#CFD7E7] rounded px-6 py-2 text-xl leading-none font-medium text-gray-900 bg-[#F5F7FB] hover:bg-white disabled:opacity-60"
      >
        <SmallUploadIcon />
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}
