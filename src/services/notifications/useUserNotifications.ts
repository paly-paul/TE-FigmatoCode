"use client";

import { useCallback, useEffect, useState } from "react";
import type { Notification } from "@/components/ui/NotificationDrawer";
import {
  formatNotificationTimestamp,
  getUserAllNotifications,
  markNotificationAsRead,
  type RrNotificationApiItem,
} from "./rrNotifications";

const NOTIFICATION_PAGE_LIMIT = 50;
const NOTIFICATION_POLL_MS = 45_000;

function categoryToVariant(category: string | undefined): Notification["variant"] {
  const c = (category ?? "").toLowerCase();
  if (c.includes("interview")) return "interview";
  if (c.includes("shortlist")) return "shortlisted";
  if (c.includes("availability")) return "availability";
  return "recruiter";
}

function toEpochMs(raw: string | undefined): number {
  if (!raw?.trim()) return 0;
  const direct = Date.parse(raw);
  if (!Number.isNaN(direct)) return direct;
  const normalized = raw.includes(" ") ? raw.replace(" ", "T") : raw;
  const withUtcSuffix = normalized.endsWith("Z") ? normalized : `${normalized}Z`;
  const parsed = Date.parse(withUtcSuffix);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeApiItems(items: RrNotificationApiItem[]): RrNotificationApiItem[] {
  const dedupedById = new Map<string, RrNotificationApiItem>();
  for (const item of items) {
    const id = item.notification_id?.trim();
    if (!id) continue;
    const existing = dedupedById.get(id);
    if (!existing || toEpochMs(item.created_on) >= toEpochMs(existing.created_on)) {
      dedupedById.set(id, item);
    }
  }
  return Array.from(dedupedById.values()).sort(
    (a, b) => toEpochMs(b.created_on) - toEpochMs(a.created_on)
  );
}

function mapApiItemToNotification(item: RrNotificationApiItem): Notification {
  const subtitleParts = [item.rr, item.message_type].filter(Boolean);
  return {
    id: item.notification_id,
    variant: categoryToVariant(item.message_category),
    title: item.message_category?.trim() || "Notification",
    subtitle: subtitleParts.length ? subtitleParts.join(" · ") : item.notification_type,
    body: item.message?.trim() || undefined,
    timestamp: formatNotificationTimestamp(item.created_on),
    read: Boolean(item.mark_as_read),
  };
}

export function useUserNotifications(userEmail: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingItemId, setMarkingItemId] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent === true;
    if (!userEmail?.trim()) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return;
    }
    if (!isSilent) {
      setLoading(true);
      setError(null);
    }
    try {
      const { ok, payload, raw } = await getUserAllNotifications({
        userEmail,
        page: 1,
        limit: NOTIFICATION_PAGE_LIMIT,
      });
      const statusLow =
        payload && typeof payload.status === "string" ? payload.status.toLowerCase() : "success";
      if (!ok || !payload || !Array.isArray(payload.data) || statusLow === "failed") {
        const msg =
          typeof (raw as { message?: { message?: string } })?.message?.message === "string"
            ? (raw as { message: { message: string } }).message.message
            : typeof (raw as { exc?: string })?.exc === "string"
              ? String((raw as { exc: string }).exc).slice(0, 200)
              : "Could not load notifications.";
        setError(msg);
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const normalized = normalizeApiItems(payload.data);
      setNotifications(normalized.map(mapApiItemToNotification));
      setUnreadCount(
        typeof payload.counts?.unread_notifications === "number"
          ? payload.counts.unread_notifications
          : normalized.filter((row) => !row.mark_as_read).length
      );
      if (isSilent) {
        setError(null);
      }
    } catch {
      setError("Could not load notifications.");
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [userEmail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userEmail?.trim() || typeof window === "undefined") return;
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh({ silent: true });
      }
    };

    const handleFocus = () => {
      refreshIfVisible();
    };

    const handleVisibilityChange = () => {
      refreshIfVisible();
    };

    const intervalId = window.setInterval(() => {
      refreshIfVisible();
    }, NOTIFICATION_POLL_MS);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh, userEmail]);

  const markAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      const { ok } = await markNotificationAsRead({});
      if (ok) await refresh();
    } finally {
      setMarkingAll(false);
    }
  }, [refresh]);

  const markOneRead = useCallback(
    async (notificationId: string) => {
      setMarkingItemId(notificationId);
      try {
        const { ok } = await markNotificationAsRead({ notification_id: notificationId });
        if (ok) await refresh();
      } finally {
        setMarkingItemId(null);
      }
    },
    [refresh]
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAllRead,
    markOneRead,
    markingAll,
    markingItemId,
  };
}
