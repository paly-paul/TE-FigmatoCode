"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthSession, getCandidateId } from "@/lib/authSession";
import { clearSessionLoginEmail } from "@/lib/profileOnboarding";
import { clearResumeWizardSession } from "@/lib/profileSession";
import { clearAllRecommendedJobsCache } from "@/lib/recommendedJobsCache";

const INACTIVITY_KEY = "te_last_activity_at";
const INACTIVITY_LOGOUT_KEY = "te_inactivity_logout_at";
const INACTIVITY_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

function nowMs() {
  return Date.now();
}

function readLastActivityMs(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(INACTIVITY_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function writeLastActivityMs(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INACTIVITY_KEY, String(value));
}

function markInactivityLogout() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INACTIVITY_LOGOUT_KEY, String(nowMs()));
}

function hasTimedOut(lastActivityMs: number | null): boolean {
  if (!lastActivityMs) return false;
  return nowMs() - lastActivityMs >= INACTIVITY_TIMEOUT_MS;
}

export default function SessionInactivityGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const isLoggingOutRef = useRef(false);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isAuthRoute =
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup");
    const isLoggedIn = Boolean(getCandidateId());
    if (!isLoggedIn || isAuthRoute) return;

    const completeLogout = async () => {
      if (isLoggingOutRef.current) return;
      isLoggingOutRef.current = true;
      try {
        await fetch("/api/method/logout", { method: "POST" });
      } catch {
        // Best-effort backend logout; always clear local state.
      } finally {
        markInactivityLogout();
        clearAuthSession();
        clearSessionLoginEmail();
        clearResumeWizardSession();
        clearAllRecommendedJobsCache();
        router.replace("/login");
        router.refresh();
      }
    };

    const checkTimeout = () => {
      if (hasTimedOut(readLastActivityMs())) {
        void completeLogout();
      }
    };

    const writeActivity = () => {
      const ts = nowMs();
      if (ts - lastWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
      writeLastActivityMs(ts);
      lastWriteRef.current = ts;
    };

    // Initialize activity timestamp for newly logged-in sessions.
    if (!readLastActivityMs()) {
      const ts = nowMs();
      writeLastActivityMs(ts);
      lastWriteRef.current = ts;
    } else {
      checkTimeout();
      writeActivity();
    }

    const onUserActivity = () => {
      writeActivity();
      checkTimeout();
    };

    const onVisibilityOrFocus = () => {
      checkTimeout();
      writeActivity();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === INACTIVITY_LOGOUT_KEY) {
        clearAuthSession();
        clearSessionLoginEmail();
        clearResumeWizardSession();
        clearAllRecommendedJobsCache();
        router.replace("/login");
        router.refresh();
      }
    };

    const events: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];
    for (const eventName of events) {
      window.addEventListener(eventName, onUserActivity, { passive: true });
    }
    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("storage", onStorage);

    const timer = window.setInterval(checkTimeout, CHECK_INTERVAL_MS);

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, onUserActivity);
      }
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, [pathname, router]);

  return null;
}
