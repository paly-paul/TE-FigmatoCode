"use client";

import { CheckCircle2, Lightbulb } from "lucide-react";
import { BaseDrawer } from "../ui/BaseDrawer";

interface ProfileVisibilityInfoDrawerProps {
  open: boolean;
  onClose: () => void;
}

const VISIBILITY_ITEMS = [
  "Complete all profile sections",
  "Add & update skills",
  "Upload latest resume",
  "Set job preferences",
  'Enable "Actively looking"',
  "Apply to relevant jobs",
  "Stay active weekly",
  "Respond to recruiters fast",
  "Add profile photo",
];

export default function ProfileVisibilityInfoDrawer({
  open,
  onClose,
}: ProfileVisibilityInfoDrawerProps) {
  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="Profile Visibility Info"
      widthClassName="w-full sm:w-[92%] md:w-[540px] lg:w-[570px]"
      bodyClassName="px-4 py-4 sm:px-5 sm:py-5"
      contentClassName="space-y-4"
      headerActions={
        <p className="text-sm text-[#5E7397]">Ways to improve your score</p>
      }
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#1447E6] px-6 py-2.5 text-base font-medium text-white transition hover:bg-[#103CC1]"
          >
            Okay
          </button>
        </div>
      }
    >
      <div className="rounded-sm border border-[#D8E3F8] bg-white p-4 sm:p-5">
        <div className="space-y-4">
          {VISIBILITY_ITEMS.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#16A34A]" />
              <p className="text-base text-[#202939] sm:text-[1.02rem]">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded border border-[#D8E3F8] bg-[#F5F8FF] px-4 py-3">
        <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#1447E6]" />
        <p className="text-sm text-[#202939]">
          Your visibility score may drop if you stay inactive for long.
        </p>
      </div>
    </BaseDrawer>
  );
}
