"use client";

import { useEffect, useRef, RefObject } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Default data (mirrors the screenshot) ────────────────────────────────────

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    variant: "interview",
    title: "Interview request received",
    subtitle: "Senior Engineer · Atlanta",
    actionLabel: "Confirm",
    timestamp: "1h",
  },
  {
    id: "2",
    variant: "shortlisted",
    title: "You have been shortlisted!",
    subtitle: "Senior Engineer · Atlanta",
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

// ── Icon per variant ──────────────────────────────────────────────────────────

function NotifIcon({ variant }: { variant: NotificationVariant }) {
  const base = "w-9 h-9 rounded-full flex items-center justify-center shrink-0";

  if (variant === "interview" || variant === "shortlisted") {
    return (
      <span className={`${base} bg-violet-100`}>
        <svg className="w-4.5 h-4.5 text-violet-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      </span>
    );
  }

  if (variant === "availability") {
    return (
      <span className={`${base} bg-blue-100`}>
        <svg className="w-4.5 h-4.5 text-blue-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </span>
    );
  }

  return (
    <span className={`${base} bg-green-100`}>
      <svg className="w-4.5 h-4.5 text-green-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 1 0 7.75" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </span>
  );
}

// ── Single notification card ──────────────────────────────────────────────────

function NotificationCard({ notification }: { notification: Notification }) {
  const { variant, title, subtitle, body, actionLabel, timestamp } = notification;
  const isHighlighted = variant === "interview" || variant === "shortlisted";

  return (
    <div
      className={`px-4 py-3.5 flex gap-3 transition-colors ${
        isHighlighted ? "bg-blue-50/60" : "bg-white"
      } border-b border-gray-100 last:border-b-0`}
    >
      <NotifIcon variant={variant} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{title}</p>
          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 mt-0.5">{timestamp}</span>
        </div>

        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
        {body && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{body}</p>
        )}

        <button
          type="button"
          className="mt-2.5 px-3.5 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export function NotificationDrawer({
  open,
  onClose,
  notifications = DEFAULT_NOTIFICATIONS,
  triggerRef,
}: NotificationDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close on outside click — exclude the trigger button itself
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        drawerRef.current?.contains(target) ||
        triggerRef?.current?.contains(target)
      ) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, triggerRef]);

  // Lock body scroll on mobile when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className={`
          fixed z-50 bg-white shadow-xl transition-all duration-200 ease-in-out
          bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh]
          md:bottom-auto md:left-auto md:right-4 md:top-[56px]
          md:rounded-2xl md:w-[380px] md:max-h-[600px]
          ${
            open
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-full opacity-0 pointer-events-none md:translate-y-2"
          }
        `}
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}
      >
        {/* Pull handle — mobile only */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full md:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold bg-primary-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors focus:outline-none"
            >
              Mark all as read
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Close notifications"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 56px)" }}>
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationCard key={n.id} notification={n} />
            ))
          )}
        </div>
      </div>
    </>
  );
}