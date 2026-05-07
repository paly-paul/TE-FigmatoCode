"use client";

import { Calendar, Clock, Globe, Layers, Monitor, Phone, Video } from "lucide-react";

export type UpcomingInterviewDisplay = {
  id: string;
  jobTitle: string;
  interviewRound?: number;
  interviewType?: string;
  interviewMode?: string;
  slotDate?: string;
  slotTime?: string;
  slotTimezone?: string;
};

function formatSlotDate(date?: string): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSlotTime(time?: string): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const d = new Date();
  d.setHours(h, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ModeIcon({ mode }: { mode?: string }) {
  const lower = mode?.toLowerCase() ?? "";
  if (lower.includes("virtual") || lower.includes("online") || lower.includes("video")) {
    return <Video className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />;
  }
  if (lower.includes("phone")) {
    return <Phone className="h-4 w-4 shrink-0 text-sky-500" aria-hidden />;
  }
  return <Monitor className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />;
}

function modeTextColor(mode?: string): string {
  const lower = mode?.toLowerCase() ?? "";
  if (lower.includes("virtual") || lower.includes("online") || lower.includes("video")) return "text-emerald-700";
  if (lower.includes("phone")) return "text-sky-700";
  return "text-orange-700";
}

function InterviewCard({ interview }: { interview: UpcomingInterviewDisplay }) {
  const dateLabel = formatSlotDate(interview.slotDate);
  const timeLabel = formatSlotTime(interview.slotTime);

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      role="article"
      aria-label={interview.jobTitle}
    >
      {/* Badge */}
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
        <Calendar className="h-3.5 w-3.5" aria-hidden />
        Interview Scheduled
      </div>

      {/* Job title */}
      <h3 className="mb-3 text-base font-semibold text-gray-900 leading-snug">
        {interview.jobTitle}
      </h3>

      {/* Detail rows */}
      <div className="flex flex-col gap-2 text-sm">
        {interview.interviewRound != null && (
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
            <span className="text-gray-500">
              Round{" "}
              <span className="font-semibold text-violet-700">{interview.interviewRound}</span>
            </span>
          </div>
        )}

        {interview.interviewType && (
          <div className="flex items-center gap-2 pl-6">
            <span className="text-gray-500">
              Type:{" "}
              <span className="font-semibold text-blue-700">{interview.interviewType}</span>
            </span>
          </div>
        )}

        {interview.interviewMode && (
          <div className="flex items-center gap-2">
            <ModeIcon mode={interview.interviewMode} />
            <span className={`font-medium ${modeTextColor(interview.interviewMode)}`}>
              {interview.interviewMode}
            </span>
          </div>
        )}
      </div>

      {/* Date / time section */}
      <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
          <span className="font-medium text-indigo-700">{dateLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
          <span className="font-medium text-blue-700">
            {timeLabel}
            {interview.slotTimezone && (
              <span className="font-normal text-blue-500"> ({interview.slotTimezone})</span>
            )}
          </span>
        </div>

        {interview.slotTimezone && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <span className="text-gray-500">{interview.slotTimezone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function InterviewActionCardsSection({ items }: { items: UpcomingInterviewDisplay[] }) {
  if (items.length === 0) {
    return (
      <div className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-gray-900">No upcoming interviews</p>
        <p className="mt-2 text-sm text-gray-600">You don&apos;t have any interviews scheduled right now.</p>
        <p className="mt-2 text-sm text-gray-500">We&apos;ll show them here once they&apos;re confirmed.</p>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((interview) => (
        <InterviewCard key={interview.id} interview={interview} />
      ))}
    </div>
  );
}
