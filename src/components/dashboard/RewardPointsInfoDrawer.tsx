"use client";

import { CheckCircle2 } from "lucide-react";
import { BaseDrawer } from "../ui/BaseDrawer";

interface RewardPointsInfoDrawerProps {
  open: boolean;
  onClose: () => void;
}

const EARNING_ITEMS = [
  "Update profile details -> +50",
  "Add new skills -> +30",
  "Complete certifications -> +100",
  "Log in daily -> +10",
  "Apply to relevant jobs -> +20",
  "Get recruiter interest -> +80",
  "Refer a job -> +80",
];

const SPEND_ITEMS = [
  "To appear higher in recruiter search results",
  "Learn new skills / certifications and boost visibility",
  "Learning platform subscriptions",
  "Sector related journal subscriptions",
];

export default function RewardPointsInfoDrawer({
  open,
  onClose,
}: RewardPointsInfoDrawerProps) {
  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="Reward Points"
      widthClassName="w-full sm:w-[92%] md:w-[560px] lg:w-[600px]"
      bodyClassName="px-4 py-4 sm:px-5 sm:py-5"
      contentClassName="space-y-4"
      headerActions={
        <p className="text-sm text-[#5E7397]">Earning & Benefits</p>
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
        <h3 className="text-lg font-semibold text-[#202939]">Earn when you:</h3>

        <div className="mt-4 space-y-4">
          {EARNING_ITEMS.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#16A34A]" />
              <p className="text-base text-[#202939] sm:text-[1.02rem]">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-[#D8E3F8] bg-[#F5F8FF] p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-[#202939]">Spend your points on:</h3>

        <div className="mt-4 space-y-4">
          {SPEND_ITEMS.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#16A34A]" />
              <p className="text-base text-[#202939] sm:text-[1.02rem]">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </BaseDrawer>
  );
}
