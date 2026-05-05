"use client";

import { Calendar, MapPin, Pin } from "lucide-react";

export type UpcomingInterviewDisplay = {
  id: string;
  title: string;
  company: string;
  location: string;
  /** e.g. "Today, 3:00 PM" */
  scheduleLabel: string;
  /** e.g. "Virtual (Zoom)" */
  modalityLabel: string;
  status: string;
};

function InterviewCard({ interview }: { interview: UpcomingInterviewDisplay }) {
  const locationLine =
    `${interview.company}${interview.location ? ` • ${interview.location}` : ""}`.trim();

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm"
      role="article"
      aria-label={interview.title}
    >
      <h3 className="text-base font-semibold text-gray-900">{interview.title}</h3>

      <div className="mt-3 flex flex-col gap-2 text-sm text-gray-600">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <MapPin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span>{locationLine || "—"}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <Calendar className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span>{interview.scheduleLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <Pin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span>{interview.modalityLabel}</span>
        </div>
      </div>

      <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-700">
        <span className="font-medium text-gray-800">Status:</span> {interview.status}
      </p>
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
