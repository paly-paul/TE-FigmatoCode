"use client";

import { RefObject } from "react";
import { BaseDrawer } from "./BaseDrawer";

type NotificationVariant = "interview" | "shortlisted" | "availability" | "recruiter";

interface Notification {
  id: string;
  variant: NotificationVariant;
  title: string;
  subtitle?: string;
  body?: string;
  actionLabel: string;
  timestamp: string;
  read?: boolean;
}

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications?: Notification[];
  triggerRef?: RefObject<HTMLElement>;
}

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    variant: "interview",
    title: "Interview request received",
    subtitle: "Senior Engineer - Atlanta",
    actionLabel: "Confirm",
    timestamp: "1h",
  },
  {
    id: "2",
    variant: "shortlisted",
    title: "You have been shortlisted!",
    subtitle: "Senior Engineer - Atlanta",
    actionLabel: "Respond Availability",
    timestamp: "2h",
  },
  {
    id: "3",
    variant: "availability",
    title: "Update availability to stay visible",
    body: "Your availability status impacts profile visibility. Update it to stay in recruiter searches.",
    actionLabel: "Take Action",
    timestamp: "2h",
  },
  {
    id: "4",
    variant: "recruiter",
    title: "Recruiters searched for your role today",
    body: "Recruiters are looking for profiles like yours today. Stay active to get discovered.",
    actionLabel: "See Recommended Jobs",
    timestamp: "1 day",
  },
];

function NotifIcon({ variant }: { variant: NotificationVariant }) {
  const base = "w-8 h-8 rounded-lg flex items-center justify-center shrink-0";

  if (variant === "interview" || variant === "shortlisted") {
    return (
      <span className={`${base} bg-orange-100`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      </span>
    );
  }

  if (variant === "availability") {
    return (
      <span className={`${base} bg-blue-100`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </span>
    );
  }

  return (
    <span className={`${base} bg-green-100`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </span>
  );
}

function NotificationCard({ notification }: { notification: Notification }) {
  const { variant, title, subtitle, body, actionLabel, timestamp } = notification;

  return (
    <div className="px-5 py-4 flex gap-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      <div className="mt-0.5">
        <NotifIcon variant={variant} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{title}</p>
          <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">{timestamp}</span>
        </div>

        {subtitle ? (
          <p className="text-[11px] text-gray-500 mb-2">{subtitle}</p>
        ) : null}
        {body ? (
          <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{body}</p>
        ) : null}

        <button
          type="button"
          className="px-3 py-1 text-[11px] font-medium text-gray-700 border border-gray-300 rounded-md bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export function NotificationDrawer({
  open,
  onClose,
  notifications = DEFAULT_NOTIFICATIONS,
  triggerRef,
}: NotificationDrawerProps) {
  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="Notifications"
      triggerRef={triggerRef}
      widthClassName="sm:w-[360px]"
      bodyClassName="p-0"
      contentClassName="h-full"
      headerActions={
        <button
          type="button"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
        >
          Mark all as read
        </button>
      }
    >
      {notifications.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          No notifications yet
        </div>
      ) : (
        notifications.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} />
        ))
      )}
    </BaseDrawer>
  );
}
