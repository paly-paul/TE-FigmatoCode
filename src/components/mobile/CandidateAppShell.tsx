"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  LayoutGrid,
  LogOut,
  Menu,
  User,
  X,
  Zap,
} from "lucide-react";
import { NotificationDrawer } from "@/components/ui/NotificationDrawer";
import { clearAuthSession } from "@/lib/authSession";
import { clearSessionLoginEmail, getSessionLoginEmail } from "@/lib/profileOnboarding";
import { useUserNotifications } from "@/services/notifications";
import { clearResumeWizardSession } from "@/lib/profileSession";

export type CandidateBottomTab = "action" | "jobs" | "insights";

export type TimesheetBottomTab = "overview" | "timesheet";

const MENU_LINKS = [
  { label: "Dashboard", href: "/dashboard/" },
  { label: "Jobs", href: "/jobs/" },
  { label: "Timesheet", href: "/timesheet/" },
] as const;

type CandidateAppShellProps = {
  children: React.ReactNode;
  /** Highlights the bottom tab; omit on routes like /timesheet (none active). */
  activeBottomTab?: CandidateBottomTab;
  onActionCenterClick?: () => void;
  onJobsClick?: () => void;
  onInsightsClick?: () => void;
  /** Set false for full-screen flows (e.g. mobile Jobs) with no tab bar. */
  showBottomNav?: boolean;
  /**
   * When set, shows the 2-tab Timesheet nav (Overview | Timesheet) with the same
   * styling as the main app nav instead of Action Center / Jobs / Insights.
   */
  timesheetNav?: {
    active: TimesheetBottomTab;
    onChange: (tab: TimesheetBottomTab) => void;
  };
};

export default function CandidateAppShell({
  children,
  activeBottomTab,
  onActionCenterClick,
  onJobsClick,
  onInsightsClick,
  showBottomNav = true,
  timesheetNav,
}: CandidateAppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    error: notifError,
    refresh: refreshNotifications,
    markAllRead,
    markOneRead,
    markingAll,
    markingItemId,
  } = useUserNotifications(sessionEmail);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    setSessionEmail(getSessionLoginEmail());
  }, [pathname]);

  useEffect(() => {
    if (notifOpen && sessionEmail) void refreshNotifications();
  }, [notifOpen, sessionEmail, refreshNotifications]);

  const navigateTo = (href: string) => {
    if (!href) return;
    const current = (pathname || "/").replace(/\/$/, "") || "/";
    const next = href.replace(/\/$/, "") || "/";
    if (current === next) {
      setMenuOpen(false);
      return;
    }
    setMenuOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/method/logout/", { method: "POST" });
    } catch {
      /* still sign out locally */
    } finally {
      clearAuthSession();
      clearSessionLoginEmail();
      clearResumeWizardSession();
      setMenuOpen(false);
      router.push("/login/");
      router.refresh();
      setIsLoggingOut(false);
    }
  };

  const isMenuActive = (href: string) => {
    const h = href.replace(/\/$/, "") || "/";
    const p = (pathname || "/").replace(/\/$/, "") || "/";
    if (h === "/dashboard") return p === "/dashboard";
    return p === h || p.startsWith(`${h}/`);
  };

  return (
    <div className="flex h-[100svh] min-h-[100svh] flex-col overflow-hidden bg-[#EEF0F3]">
      <header className="sticky top-0 z-40 flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/dashboard/"
            className="flex items-center gap-2 min-w-0"
            onClick={() => setMenuOpen(false)}
          >
            <Image src="/icons/logo.jpeg" width={36} height={36} alt="SixFE Logo" />
            <span className="truncate text-base font-semibold text-gray-900">SixFE</span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              ref={bellRef}
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              className="relative rounded-lg p-2.5 text-gray-600 hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {sessionEmail && unreadCount > 0 ? (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
                  aria-hidden
                />
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2.5 text-gray-700 hover:bg-gray-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 flex flex-col bg-white transition-all duration-250 ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 translate-x-2"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        aria-hidden={!menuOpen}
      >
          <div className="flex justify-end p-4">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-8 px-8 pt-4">
            {MENU_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`text-lg font-medium ${
                  isMenuActive(item.href)
                    ? "text-gray-900"
                    : "text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/profile/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-900"
              >
                <User className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
                Profile
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-900"
              >
                <LogOut className="h-4 w-4 text-red-500" strokeWidth={1.5} />
                {isLoggingOut ? "…" : "Logout"}
              </button>
            </div>
          </div>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto ${
          showBottomNav
            ? "pb-0"
            : "pb-[env(safe-area-inset-bottom,0px)]"
        }`}
      >
        {children}
      </div>

      {showBottomNav ? (
      <nav
        className="sticky bottom-0 left-0 right-0 z-40 mt-auto border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Primary"
      >
        {timesheetNav ? (
          <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-2">
            <button
              type="button"
              onClick={() => timesheetNav.onChange("overview")}
              className="flex flex-col items-center justify-center gap-1 text-xs font-medium"
            >
              <LayoutGrid
                className={`h-6 w-6 ${
                  timesheetNav.active === "overview"
                    ? "text-blue-600"
                    : "text-gray-400"
                }`}
                strokeWidth={1.75}
              />
              <span
                className={
                  timesheetNav.active === "overview"
                    ? "font-semibold text-blue-600"
                    : "text-gray-500"
                }
              >
                Overview
              </span>
            </button>
            <button
              type="button"
              onClick={() => timesheetNav.onChange("timesheet")}
              className="flex flex-col items-center justify-center gap-1 text-xs font-medium"
            >
              <CalendarDays
                className={`h-6 w-6 ${
                  timesheetNav.active === "timesheet"
                    ? "text-blue-600"
                    : "text-gray-400"
                }`}
                strokeWidth={1.75}
              />
              <span
                className={
                  timesheetNav.active === "timesheet"
                    ? "font-semibold text-blue-600"
                    : "text-gray-500"
                }
              >
                Timesheet
              </span>
            </button>
          </div>
        ) : (
          <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-3">
            <button
              type="button"
              onClick={onActionCenterClick ?? (() => navigateTo("/dashboard/"))}
              className="flex flex-col items-center justify-center gap-1 text-xs font-medium"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  activeBottomTab === "action"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-transparent text-gray-400"
                }`}
              >
                <Zap className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <span
                className={
                  activeBottomTab === "action" ? "text-blue-600" : "text-gray-500"
                }
              >
                Action Center
              </span>
            </button>

            <button
              type="button"
              onClick={onJobsClick ?? (() => navigateTo("/jobs/"))}
              className="flex flex-col items-center justify-center gap-1 text-xs font-medium"
            >
              <BriefcaseBusiness
                className={`h-6 w-6 ${
                  activeBottomTab === "jobs" ? "text-blue-600" : "text-gray-400"
                }`}
                strokeWidth={1.75}
              />
              <span
                className={
                  activeBottomTab === "jobs" ? "text-blue-600" : "text-gray-500"
                }
              >
                Jobs For You
              </span>
            </button>

            <button
              type="button"
              onClick={onInsightsClick ?? (() => navigateTo("/dashboard/visibility-score/"))}
              className="flex flex-col items-center justify-center gap-1 text-xs font-medium"
            >
              <BarChart3
                className={`h-6 w-6 ${
                  activeBottomTab === "insights"
                    ? "text-blue-600"
                    : "text-gray-400"
                }`}
                strokeWidth={1.75}
              />
              <span
                className={
                  activeBottomTab === "insights"
                    ? "text-blue-600"
                    : "text-gray-500"
                }
              >
                Insights
              </span>
            </button>
          </div>
        )}
      </nav>
      ) : null}

      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        triggerRef={bellRef}
        notifications={notifications}
        loading={notifLoading}
        error={notifError}
        onMarkAllRead={sessionEmail ? markAllRead : undefined}
        onMarkItemRead={sessionEmail ? markOneRead : undefined}
        markingAll={markingAll}
        markingItemId={markingItemId}
      />
    </div>
  );
}
