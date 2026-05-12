"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  ExternalLink,
  Globe,
  Layers,
  MapPin,
  MessageSquare,
  Monitor,
  Phone,
  User,
  Video,
  X,
} from "lucide-react";
import {
  extractUrlFromHtml,
  getInterviewDetails,
  type InterviewDetailsApi,
} from "@/services/jobs/interviewsApi";

export type UpcomingInterviewDisplay = {
  id: string;
  jobTitle: string;
  candidateId?: string;
  jobId?: string;
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

function DetailRow({
  icon,
  label,
  children,
  iconBg = "bg-gray-50",
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  iconBg?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide leading-none mb-1">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

function InterviewDetailModal({
  interview,
  onClose,
  onDetailsLoaded,
}: {
  interview: UpcomingInterviewDisplay;
  onClose: () => void;
  onDetailsLoaded?: (det: InterviewDetailsApi) => void;
}) {
  const [details, setDetails] = useState<InterviewDetailsApi | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    if (!interview.candidateId || !interview.jobId) {
      setDetailsError("Interview details unavailable (missing candidate or job ID).");
      return;
    }
    setDetailsLoading(true);
    setDetailsError(null);
    getInterviewDetails(interview.candidateId, interview.jobId)
      .then((det) => {
        setDetails(det);
        onDetailsLoaded?.(det);
      })
      .catch((err: unknown) => {
        setDetails(null);
        setDetailsError(err instanceof Error ? err.message : "Failed to load interview details.");
      })
      .finally(() => setDetailsLoading(false));
  }, [interview.candidateId, interview.jobId]);

  // Match the schedule entry for the round shown on this card, fall back to first entry
  const schedule =
    details?.interview_schedule?.find((s) => s.round === interview.interviewRound) ??
    details?.interview_schedule?.[0];

  const round = schedule?.round ?? interview.interviewRound;
  const type = schedule?.interview_type ?? interview.interviewType;
  const mode = schedule?.interview_mode ?? interview.interviewMode;
  const date = schedule?.agreed_interview_date ?? interview.slotDate;
  const time = schedule?.agreed_interview_time ?? interview.slotTime;
  const timezone = schedule?.agreed_interview_timezone ?? interview.slotTimezone;
  const meetingUrl =
    extractUrlFromHtml(schedule?.meeting_invite_content) ??
    (schedule?.meeting_link?.trim() || schedule?.join_url?.trim() || null);
  const remarks = schedule?.remarks;
  const interviewers = schedule?.interviewers ?? [];
  const customer = schedule?.customer;

  const dateLabel = formatSlotDate(date);
  const timeLabel = formatSlotTime(time);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Interview details for ${interview.jobTitle}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Coloured header strip */}
        <div className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 pt-5 pb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white mb-2">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                Interview Scheduled
              </span>
              <h2 className="text-xl font-bold text-white leading-snug">
                {interview.jobTitle}
              </h2>
              {interview.jobId && (
                <p className="text-sm text-blue-200 mt-0.5">{interview.jobId}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-xl p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">

        {/* Join Meeting CTA — shown only when link is available */}
        {meetingUrl && (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold py-3 shadow-md shadow-emerald-200 transition-colors"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Join Meeting
          </a>
        )}

          {detailsLoading && (
            <div className="flex items-center gap-2 justify-center py-2">
              <div className="h-4 w-4 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
              <p className="text-xs text-gray-400">Loading details…</p>
            </div>
          )}

          {detailsError && !detailsLoading && (
            <p className="text-xs text-red-500 text-center rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              {detailsError}
            </p>
          )}

          {/* Interview meta — Round, Type, Mode */}
          {(round != null || type || mode) && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Interview Details
              </p>
              <div className="flex flex-wrap gap-2">
                {round != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 border border-violet-100 px-3 py-1.5 text-sm font-semibold text-violet-700">
                    <Layers className="h-3.5 w-3.5" aria-hidden />
                    Round {round}
                  </span>
                )}
                {type && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-700">
                    {type}
                  </span>
                )}
                {mode && (
                  <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold ${modeBgColor(mode)} ${modeTextColor(mode)}`}>
                    <ModeIcon mode={mode} />
                    {mode}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
              Schedule
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                <div>
                  <p className="text-xs text-indigo-400 leading-none mb-0.5">Date</p>
                  <p className="text-sm font-semibold text-indigo-700 leading-snug">{dateLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                <div>
                  <p className="text-xs text-blue-400 leading-none mb-0.5">Time</p>
                  <p className="text-sm font-semibold text-blue-700">{timeLabel}</p>
                </div>
              </div>
            </div>
            {timezone && (
              <div className="flex items-center gap-2 pt-1 border-t border-indigo-100">
                <Globe className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <p className="text-sm text-gray-500">{timezone}</p>
              </div>
            )}
          </div>

          {/* Extra details from API */}
          {schedule && (
            <div className="flex flex-col gap-4">
              {/* Interviewers */}
              {interviewers.length > 0 && (
                <DetailRow
                  icon={<User className="h-4.5 w-4.5 text-gray-500" aria-hidden />}
                  label={interviewers.length > 1 ? "Interviewers" : "Interviewer"}
                  iconBg="bg-gray-100"
                >
                  {interviewers.map((iv, i) => (
                    <div key={i} className={i > 0 ? "mt-1" : ""}>
                      <p className="text-sm font-semibold text-gray-800">{iv.full_name ?? iv.user}</p>
                      {iv.email && <p className="text-xs text-gray-500">{iv.email}</p>}
                    </div>
                  ))}
                </DetailRow>
              )}

              {/* Customer / Company */}
              {customer && (
                <DetailRow
                  icon={<MapPin className="h-4.5 w-4.5 text-orange-500" aria-hidden />}
                  label="Company"
                  iconBg="bg-orange-50"
                >
                  <p className="text-sm font-semibold text-gray-800">{customer}</p>
                </DetailRow>
              )}

              {/* Remarks */}
              {remarks && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                      Remarks
                    </p>
                  </div>
                  <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">
                    {remarks}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pb-5 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
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
  cachedMeetingUrl,
  onClick,
}: {
  interview: UpcomingInterviewDisplay;
  cachedMeetingUrl?: string | null;
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
      {/* Top row: badge + meeting chip */}
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          Interview Scheduled
        </div>
        {cachedMeetingUrl && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            <ExternalLink className="h-3 w-3" aria-hidden />
            Meeting link
          </span>
        )}
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
      </div>

      {/* Tap hint */}
      <p className="mt-3 text-xs text-gray-400 text-right">Tap to view details →</p>
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function InterviewActionCardsSection({ items }: { items: UpcomingInterviewDisplay[] }) {
  const [selected, setSelected] = useState<UpcomingInterviewDisplay | null>(null);
  // Cache meeting URLs keyed by interview id so cards can show the chip after first open
  const [meetingUrlCache, setMeetingUrlCache] = useState<Record<string, string>>({});

  const handleDetailsLoaded = (id: string, det: InterviewDetailsApi) => {
    const schedule = det.interview_schedule?.[0];
    const url = extractUrlFromHtml(schedule?.meeting_invite_content) ?? null;
    if (url) setMeetingUrlCache((prev) => ({ ...prev, [id]: url }));
  };

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
            cachedMeetingUrl={meetingUrlCache[interview.id]}
            onClick={() => setSelected(interview)}
          />
        ))}
      </div>

      {selected && (
        <InterviewDetailModal
          interview={selected}
          onClose={() => setSelected(null)}
          onDetailsLoaded={(det) => handleDetailsLoaded(selected.id, det)}
        />
      )}
    </>
  );
}
