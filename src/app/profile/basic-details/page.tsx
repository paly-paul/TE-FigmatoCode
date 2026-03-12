"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { BasicDetailsForm } from "@/components/profile/BasicDetailsForm";
import { PersonalInfoCard } from "@/components/profile/PersonalInfoCard";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";

export default function BasicDetailsPage() {
  const router = useRouter();
  const [lookingForJob, setLookingForJob] = useState(true);

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6]">
      {/* ── Top Navbar ── */}
      <AppNavbar />

      {/* ── Page body ── */}
      <div className="flex flex-col flex-1">
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

        {/* 3-column content */}
        <div className="flex gap-6 px-8 pb-28 items-start">
          {/* Left: Stepper — step 1 done, step 2 active */}
          <ProfileStepper currentStep={2} />

          {/* Centre: Basic Details form */}
          <div className="flex-1 min-w-0">
            <BasicDetailsForm />
          </div>

          {/* Right: Progress card + Personal Info card */}
          <div className="w-72 shrink-0 flex flex-col gap-4">
            <ProfileProgressCard
              percent={40}
              description="Higher profile strength improves recruiter visibility"
            />
            <PersonalInfoCard />
          </div>
        </div>
      </div>

      {/* ── Fixed footer ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-8 py-4 flex justify-end gap-3 z-10">
        <Button
          variant="outline"
          fullWidth={false}
          onClick={() => router.push("/profile/create")}
          className="px-8"
        >
          Previous
        </Button>
        <Button
          fullWidth={false}
          onClick={() => router.push("/profile/skills")}
          className="px-8"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
