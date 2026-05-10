"use client";

import { useState } from "react";
import { Calendar, Clock, Globe, Layers, Monitor, Phone, Video, X } from "lucide-react";

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
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatSlotDateShort(date?: string): string {
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

function ModeIcon({ mode, size = "sm" }: { mode?: string; size?: "sm" | "lg" }) {
  const lower = mode?.toLowerCase() ?? "";
  const cls = size === "lg" ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0";
  if (lower.includes("virtual") || lower.includes("online") || lower.includes("video")) {
    return <Video className={`${cls} text-emerald-500`} aria-hidden />;
  }
  if (lower.includes("phone")) {
    return <Phone className={`${cls} text-sky-500`} aria-hidden />;
  }
  return <Monitor className={`${cls} text-orange-400`} aria-hidden />;
}

function modeTextColor(mode?: string): string {
  const lower = mode?.toLowerCase() ?? "";
  if (lower.includes("virtual") || lower.includes("online") || lower.includes("video")) return "text-emerald-700";
  if (lower.includes("phone")) return "text-sky-700";
  return "text-orange-700";
}

function modeBgColor(mode?: string): string {
  const lower = mode?.toLowerCase() ?? "";
  if (lower.includes("virtual") || lower.includes("online") || lower.includes("video")) return "bg-emerald-50 border-emerald-200";
  if (lower.includes("phone")) return "bg-sky-50 border-sky-200";
  return "bg-orange-50 border-orange-200";
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function InterviewDetailModal({
  interview,
  onClose,
}: {
  interview: UpcomingInterviewDisplay;
  onClose: () => void;
}) {
  const dateLabel = formatSlotDate(interview.slotDate);
  const timeLabel = formatSlotTime(interview.slotTime);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Interview details for ${interview.jobTitle}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 mb-2">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Interview Scheduled
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">
              {interview.jobTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Round & Type */}
          {(interview.interviewRound != null || interview.interviewType) && (
            <div className="flex flex-col gap-3">
              {interview.interviewRound != null && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                    <Layers className="h-4.5 w-4.5 text-violet-500" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 leading-none mb-0.5">Round</p>
                    <p className="text-sm font-semibold text-violet-700">
                      Round {interview.interviewRound}
                    </p>
                  </div>
                </div>
              )}

              {interview.interviewType && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <span className="text-sm font-bold text-blue-500">T</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 leading-none mb-0.5">Type</p>
                    <p className="text-sm font-semibold text-blue-700">{interview.interviewType}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode */}
          {interview.interviewMode && (
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${modeBgColor(interview.interviewMode)}`}>
              <ModeIcon mode={interview.interviewMode} size="lg" />
              <div>
                <p className="text-xs text-gray-400 leading-none mb-0.5">Interview Mode</p>
                <p className={`text-sm font-semibold ${modeTextColor(interview.interviewMode)}`}>
                  {interview.interviewMode}
                </p>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 shrink-0 text-indigo-500" aria-hidden />
              <div>
                <p className="text-xs text-gray-400 leading-none mb-0.5">Date</p>
                <p className="text-sm font-semibold text-indigo-700">{dateLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 shrink-0 text-blue-500" aria-hidden />
              <div>
                <p className="text-xs text-gray-400 leading-none mb-0.5">Time</p>
                <p className="text-sm font-semibold text-blue-700">{timeLabel}</p>
              </div>
            </div>

            {interview.slotTimezone && (
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
                <div>
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Timezone</p>
                  <p className="text-sm font-medium text-gray-600">{interview.slotTimezone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function InterviewCard({
  interview,
  onClick,
}: {
  interview: UpcomingInterviewDisplay;
  onClick: () => void;
}) {
  const dateLabel = formatSlotDateShort(interview.slotDate);
  const timeLabel = formatSlotTime(interview.slotTime);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      aria-label={`View details for ${interview.jobTitle} interview`}
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

      {/* Tap hint */}
      <p className="mt-3 text-xs text-gray-400 text-right">Tap to view details →</p>
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function InterviewActionCardsSection({ items }: { items: UpcomingInterviewDisplay[] }) {
  const [selected, setSelected] = useState<UpcomingInterviewDisplay | null>(null);

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
    <>
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((interview) => (
          <InterviewCard
            key={interview.id}
            interview={interview}
            onClick={() => setSelected(interview)}
          />
        ))}
      </div>

      {selected && (
        <InterviewDetailModal
          interview={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
