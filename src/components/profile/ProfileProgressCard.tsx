"use client";

import { useEffect, useMemo, useState } from "react";

interface ProfileProgressCardProps {
  percent?: number;
  className?: string;
  description?: string;
}

export function ProfileProgressCard({
  percent = 10,
  className = "",
  description = "Complete your profile to get 3x more interview calls",
}: ProfileProgressCardProps) {
  const r = 30;
  const circumference = useMemo(() => 2 * Math.PI * r, [r]);
  const safePercent = Math.max(0, Math.min(100, percent));
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    const start = animatedPercent;
    const end = safePercent;
    const duration = 600;
    let startTime: number | null = null;
    let rafId = 0;

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPercent(start + (end - start) * eased);

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [safePercent]);

  const offset = circumference * (1 - animatedPercent / 100);

  return (
    <aside className={`w-full xl:w-80 shrink-0 ${className}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
        <div className="relative shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle
              cx="36"
              cy="36"
              r={r}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="5"
            />
            <circle
              cx="36"
              cy="36"
              r={r}
              fill="none"
              stroke="#2563EB"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
            {Math.round(animatedPercent)}%
          </span>
        </div>

        <div className="flex flex-col gap-1 pt-1">
          <p className="text-sm font-semibold text-gray-900">Profile Progress</p>
          <p className="text-xs text-gray-500 leading-snug">{description}</p>
        </div>
      </div>
    </aside>
  );
}
