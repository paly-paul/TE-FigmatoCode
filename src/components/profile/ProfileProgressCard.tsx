interface ProfileProgressCardProps {
  percent?: number;
  description?: string;
}

export function ProfileProgressCard({
  percent = 10,
  description = "Complete your profile to get 3× more interview calls",
}: ProfileProgressCardProps) {
  // SVG circle maths
  const r = 30;
  const circumference = 2 * Math.PI * r; // ≈ 188.5
  const offset = circumference * (1 - percent / 100);

  return (
    <aside className="w-64 shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
        {/* Circular progress */}
        <div className="relative shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            {/* Background ring */}
            <circle
              cx="36"
              cy="36"
              r={r}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="5"
            />
            {/* Progress arc */}
            <circle
              cx="36"
              cy="36"
              r={r}
              fill="none"
              stroke="#2563EB"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
            />
          </svg>
          {/* Percentage text */}
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
            {percent}%
          </span>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1 pt-1">
          <p className="text-sm font-semibold text-gray-900">Profile Progress</p>
          <p className="text-xs text-gray-500 leading-snug">
            {description}
          </p>
        </div>
      </div>
    </aside>
  );
}
