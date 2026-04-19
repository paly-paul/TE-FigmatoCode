"use client";

import { useCallback, useEffect, useState } from "react";
import type { Notification } from "@/components/ui/NotificationDrawer";
import {
  formatNotificationTimestamp,
  getUserAllNotifications,
  markNotificationAsRead,
  type RrNotificationApiItem,
} from "./rrNotifications";

function categoryToVariant(category: string | undefined): Notification["variant"] {
  const c = (category ?? "").toLowerCase();
  if (c.includes("interview")) return "interview";
  if (c.includes("shortlist")) return "shortlisted";
  if (c.includes("availability")) return "availability";
  return "recruiter";
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

  const refresh = useCallback(async () => {
    if (!userEmail?.trim()) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { ok, payload, raw } = await getUserAllNotifications({
        userEmail,
        page: 1,
        limit: 50,
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
      setNotifications(payload.data.map(mapApiItemToNotification));
      setUnreadCount(payload.counts?.unread_notifications ?? 0);
    } catch {
      setError("Could not load notifications.");
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
