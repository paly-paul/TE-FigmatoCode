import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

export function SectionCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-[#dfe4ec] bg-white ${className}`}>
      {title ? (
        <div className="border-b border-[#e7ebf1] px-4 py-3 sm:px-5 sm:py-3.5">
          <h2 className="text-sm font-semibold text-[#111827] sm:text-[15px]">{title}</h2>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function LabelValue({
  label,
  value,
  actions,
}: {
  label: string;
  value: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[#7b8798] sm:text-[13px]">{label}</p>
      <div className="mt-1 flex items-start gap-1.5">
        <p className="text-sm font-medium leading-5 text-[#111827] sm:text-[15px]">{value}</p>
        {actions}
      </div>
    </div>
  );
}

export function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[#7b8798] sm:text-[13px]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#111827] sm:text-[15px]">{value}</p>
    </div>
  );
}

export function CircleProgress({ value }: { value: number }) {
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;

  return (
    <div className="relative flex h-12 w-12 items-center justify-center">
      <svg className="-rotate-90 h-12 w-12" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#e3e8ef" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="#174ee7"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-[#111827]">{value}%</span>
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[#dce4ef] bg-[#f7faff] px-3 py-1.5 text-sm text-[#445064]">
      {children}
    </span>
  );
}

export function DetailTile({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="border border-[#dfe4ec] bg-white px-4 py-4">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 text-[#66758a]">{icon}</div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-[#111827] sm:text-[15px]">{title}</p>
            <ExternalLink className="h-3.5 w-3.5 text-[#66758a]" />
          </div>
          <p className="mt-1 text-sm text-[#66758a]">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
