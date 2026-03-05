"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/components/profile/AppNavbar";
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

export default function CreateProfilePage() {
  const router = useRouter();
  const [lookingForJob, setLookingForJob] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  function formatDate(date: Date) {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }

  function handleUpload(file: File) {
    setUploadedFile({
      name: file.name,
      uploadDate: formatDate(new Date()),
    });
  }

  function handleDelete() {
    setUploadedFile(null);
  }

  function handleNext() {
    if (!uploadedFile) {
      alert("Please upload your resume before continuing.");
      return;
    }
    // TODO: navigate to step 2 when implemented
    router.push("/profile/create?step=2");
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6]">
      {/* ── Top Navbar ── */}
      <AppNavbar />

      {/* ── Page body ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Sub-header */}
        <div className="flex items-center justify-between px-8 py-4">
          <h1 className="text-lg font-bold text-gray-900">Create Profile</h1>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Toggle
              id="looking-for-job"
              label="Looking for a Job"
              checked={lookingForJob}
              onChange={setLookingForJob}
            />
          </div>
        </div>

        {/* 3-column content area */}
        <div className="flex flex-1 gap-6 px-8 pb-24 overflow-y-auto">
          {/* Left: Stepper */}
          <ProfileStepper currentStep={1} />

          {/* Centre: Main content */}
          <div className="flex flex-col flex-1 gap-4 min-w-0">
            {/* Upload card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Upload Resume
              </h2>
              <ResumeUploadArea
                uploadedFile={uploadedFile}
                onUpload={handleUpload}
                onDelete={handleDelete}
              />
            </div>

            {/* Info banner — only shown when no file uploaded */}
            {!uploadedFile && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <span className="shrink-0 mt-0.5">
                  <LightbulbIcon />
                </span>
                <p className="text-sm text-gray-600">
                  Upload your resume to auto-fill skills and projects. You can
                  edit them in the next steps.
                </p>
              </div>
            )}
          </div>

          {/* Right: Profile progress */}
          <ProfileProgressCard percent={10} />
        </div>
      </div>

      {/* ── Fixed footer ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-8 py-4 flex justify-end gap-3">
        <Button
          variant="outline"
          fullWidth={false}
          onClick={() => router.back()}
          className="px-8"
        >
          Previous
        </Button>
        <Button
          fullWidth={false}
          onClick={handleNext}
          className="px-8"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
