"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { ResumeUploadArea } from "@/components/profile/ResumeUploadArea";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { LightbulbIcon } from "@/components/icons";

interface UploadedFile {
  name: string;
  uploadDate: string;
}

interface ResumeProfileData {
  professionalTitle?: string;
  experienceYears?: string;
  experienceMonths?: string;
  summary?: string;
  salaryPerMonth?: string;
  salaryCurrency?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  countryCode?: string;
  phone?: string;
}

export default function CreateProfilePage() {
  const router = useRouter();
  const [lookingForJob, setLookingForJob] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

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

  function formatDate(date: Date) {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }

  function handleUpload(file: File) {
    const meta: UploadedFile = {
      name: file.name,
      uploadDate: formatDate(new Date()),
    };
    setUploadedFile(meta);

    // Store basic profile data derived from the resume so that
    // the next step can pre-fill fields which the user can edit.
    // For now we avoid hardcoded defaults and only set fields
    // we can reasonably infer (e.g. name from file name).
    const baseData: ResumeProfileData = {};

    // Very lightweight heuristic to try and pull the candidate name
    // from the file name if it looks like "Firstname Lastname - Something.pdf".
    const nameFromFile = file.name.replace(/\.[^/.]+$/, "");
    const parts = nameFromFile.split(/[\s_-]+/);
    if (parts.length >= 2) {
      baseData.firstName = parts[0];
      baseData.lastName = parts[1];
    }

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          "resumeProfile",
          JSON.stringify(baseData)
        );
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
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("uploadedResumeMeta");
        window.sessionStorage.removeItem("resumeProfile");
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
          <ProfileStepper currentStep={1} />

          <div className="flex flex-col flex-1 gap-4 min-w-0">
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

          <ProfileProgressCard percent={uploadedFile ? 10 : 0} />
        </div>
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
