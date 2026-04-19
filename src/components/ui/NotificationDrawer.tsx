"use client";

import { RefObject, useEffect, useMemo, useState } from "react";
import { BaseDrawer } from "./BaseDrawer";
import { MOBILE_MQ } from "@/lib/mobileViewport";

export type NotificationVariant = "interview" | "shortlisted" | "availability" | "recruiter";

export interface Notification {
  id: string;
  variant: NotificationVariant;
  title: string;
  subtitle?: string;
  body?: string;
  /** Shown on the action button when the item is unread and `onMarkItemRead` is set. */
  actionLabel?: string;
  timestamp: string;
  read?: boolean;
}

export interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Live notifications from the API; defaults to an empty list. */
  notifications?: Notification[];
  triggerRef?: RefObject<HTMLElement>;
  loading?: boolean;
  error?: string | null;
  onMarkAllRead?: () => void | Promise<void>;
  onMarkItemRead?: (notificationId: string) => void | Promise<void>;
  markingAll?: boolean;
  markingItemId?: string | null;
}

function NotifIcon({ variant }: { variant: NotificationVariant }) {
  const base = "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm";

  if (variant === "interview" || variant === "shortlisted") {
    return (
      <span className={`${base} bg-[#F3EEFF]`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B3DFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      </span>
    );
  }

  if (variant === "availability") {
    return (
      <span className={`${base} bg-[#F4F7FB]`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1447E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </span>
    );
  }

  return (
    <span className={`${base} bg-[#EAFBF0]`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#12A150" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </span>
  );
}

function NotificationCard({
  notification,
  mobile = false,
  onMarkItemRead,
  markingItemId,
}: {
  notification: Notification;
  mobile?: boolean;
  onMarkItemRead?: (id: string) => void | Promise<void>;
  markingItemId?: string | null;
}) {
  const { variant, title, subtitle, body, timestamp, read } = notification;
  const actionLabel = notification.actionLabel ?? "Mark as read";
  const containerClassName = mobile
    ? `flex gap-3 border-b border-[#E6ECF6] px-3 py-4 last:border-b-0 ${
        variant === "interview" ? "bg-[#EEF4FF]" : "bg-white"
      }`
    : "flex gap-3 border-b border-gray-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-gray-50";
  const titleClassName = mobile
    ? "text-[15px] font-medium leading-7 text-[#202939]"
    : "text-sm font-semibold leading-snug text-gray-900";
  const timestampClassName = mobile
    ? "mt-0.5 shrink-0 whitespace-nowrap text-xs text-[#5E7397]"
    : "mt-0.5 shrink-0 whitespace-nowrap text-[10px] text-gray-400";
  const metaClassName = mobile
    ? "mb-3 text-sm text-[#5E7397]"
    : "mb-2 text-[11px] text-gray-500";
  const bodyClassName = mobile
    ? "mb-3 max-w-[220px] text-sm leading-6 text-[#5E7397]"
    : "mb-2 text-[11px] leading-relaxed text-gray-500";
  const buttonClassName = mobile
    ? "rounded-none border border-[#D6DCEA] bg-white px-4 py-2 text-[13px] font-medium text-[#202939] transition-colors hover:bg-gray-50 disabled:opacity-50"
    : "rounded-md border border-gray-300 bg-white px-3 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50";

  const showMarkButton = !read && typeof onMarkItemRead === "function";

  return (
    <div className={containerClassName}>
      <div className={mobile ? "mt-1" : "mt-0.5"}>
        <NotifIcon variant={variant} />
      </div>

      <div className="min-w-0 flex-1">
        <div className={`flex items-start justify-between gap-3 ${mobile ? "mb-1" : "mb-0.5"}`}>
          <p className={titleClassName}>{title}</p>
          <span className={timestampClassName}>{timestamp}</span>
        </div>

        {subtitle ? (
          <p className={metaClassName}>{subtitle}</p>
        ) : null}
        {body ? (
          <p className={bodyClassName}>{body}</p>
        ) : null}

        {showMarkButton ? (
          <button
            type="button"
            className={buttonClassName}
            disabled={markingItemId === notification.id}
            onClick={() => void onMarkItemRead(notification.id)}
          >
            {markingItemId === notification.id ? "…" : actionLabel}
          </button>
        ) : read ? (
          <span className={mobile ? "text-xs text-[#5E7397]" : "text-[10px] text-gray-400"}>Read</span>
        ) : null}
      </div>
    </div>
  );
}

export function NotificationDrawer({
  open,
  onClose,
  notifications = [],
  triggerRef,
  loading = false,
  error = null,
  onMarkAllRead,
  onMarkItemRead,
  markingAll = false,
  markingItemId = null,
}: NotificationDrawerProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const markAllControl =
    onMarkAllRead && unreadCount > 0 ? (
      <button
        type="button"
        disabled={markingAll || loading}
        onClick={() => void onMarkAllRead()}
        className={`font-medium text-[#1447E6] transition-colors hover:text-[#103CC1] focus:outline-none disabled:opacity-40 disabled:pointer-events-none ${
          isMobileViewport ? "text-sm" : "text-sm"
        }`}
      >
        {markingAll ? "…" : "Mark all as read"}
      </button>
    ) : null;

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="Notifications"
      triggerRef={triggerRef}
      placement={isMobileViewport ? "bottom" : "right"}
      panelClassName={isMobileViewport ? "h-[100svh] max-h-[100svh] rounded-t-none" : ""}
      widthClassName="sm:w-[360px]"
      bodyClassName={isMobileViewport ? "p-0" : "p-0"}
      contentClassName="h-full flex flex-col"
      headerActions={markAllControl}
    >
      {loading && notifications.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : null}

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && !error && notifications.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No notifications yet</div>
      ) : null}

      {notifications.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              mobile={isMobileViewport}
              onMarkItemRead={onMarkItemRead}
              markingItemId={markingItemId}
            />
          ))}
        </div>
      ) : null}
    </BaseDrawer>
  );
}
