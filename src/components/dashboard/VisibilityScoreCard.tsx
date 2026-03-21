"use client";

import { useRouter } from "next/navigation";

interface VisibilityScoreCardProps {
  value: number;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export default function VisibilityScoreCard({
  value,
  title = "Visibility Score",
  description = "You're well-positioned for relevant opportunities",
  className = "",
  compact = false,
}: VisibilityScoreCardProps) {
  const router = useRouter();
  const radius = compact ? 60 : 80;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      <div className={`relative w-full flex items-center justify-center ${compact ? "h-36" : "h-40 sm:h-52"}`}>
        <svg
          viewBox={compact ? "0 0 190 120" : "0 0 230 140"}
          className={`w-full ${compact ? "max-w-[220px]" : "max-w-[260px]"} h-full`}
        >
          <path
            d={compact ? "M25 95 A60 60 0 0 1 165 95" : "M20 110 A80 80 0 0 1 210 110"}
            stroke="#e5e7eb"
            strokeWidth={compact ? "14" : "18"}
            fill="none"
            strokeLinecap="butt"
          />
          <path
            d={compact ? "M25 95 A60 60 0 0 1 165 95" : "M20 110 A80 80 0 0 1 210 110"}
            stroke="#16a34a"
            strokeWidth={compact ? "14" : "18"}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="butt"
          />
        </svg>
        <div
          className={`absolute inset-x-0 flex justify-center font-bold text-gray-900 ${
            compact ? "bottom-7 text-2xl" : "bottom-8 sm:bottom-10 text-2xl sm:text-3xl"
          }`}
        >
          {value}
        </div>
      </div>

      <button
        type="button"
        className="w-full border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50"
        onClick={() => router.push("/dashboard/visibility-score")}
      >
        Improve Score
      </button>
    </div>
  );
}
