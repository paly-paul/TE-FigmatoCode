"use client";

import { X, Laptop, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

type WelcomeBackModalProps = {
  open: boolean;
  userName: string;
  onClose: () => void;
  onYesOpenToOpportunities: () => void;
  onNotRightNow: () => void;
};

export default function WelcomeBackModal({
  open,
  userName,
  onClose,
  onYesOpenToOpportunities,
  onNotRightNow,
}: WelcomeBackModalProps) {
  if (!open) return null;

  const greeting =
    userName.trim().length > 0 ? `Welcome Back, ${userName.trim()}!` : "Welcome Back!";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-back-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[440px] rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative h-44 bg-gradient-to-b from-blue-100 via-blue-50/80 to-white overflow-hidden">
          <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_30%_20%,#2563eb_0%,transparent_50%),radial-gradient(circle_at_80%_60%,#0ea5e9_0%,transparent_45%)]" />
          <div className="relative h-full flex flex-col items-center justify-end pb-4">
            <Image
              width={140}
              height={140}
              src="/images/dashboard/welcome-back.png"
              alt=""
            />
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
          <h2
            id="welcome-back-title"
            className="text-xl sm:text-2xl font-bold text-gray-900 text-center"
          >
            {greeting}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-center text-[#556987] font-medium">
            Let us know if you&apos;re open to new opportunities.
          </p>

          <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              fullWidth={false}
              className="px-5 py-2.5 text-sm border-gray-300 text-gray-800 rounded-none"
              onClick={() => {
                onNotRightNow();
                onClose();
              }}
            >
              Not Right Now
            </Button>
            <Button
              type="button"
              fullWidth={false}
              className="px-5 py-2.5 text-sm rounded-none"
              onClick={() => {
                onYesOpenToOpportunities();
                onClose();
              }}
            >
              Yes, I Am
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
