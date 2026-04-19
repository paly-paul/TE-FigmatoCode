export type RrNotificationApiItem = {
  notification_type: string;
  notification_id: string;
  rr?: string;
  message: string;
  message_category?: string;
  message_type?: string;
  created_on: string;
  mark_as_read: boolean;
};

export type UserNotificationsCounts = {
  total_notifications?: number;
  unread_notifications?: number;
};

export type UserNotificationsPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type UserNotificationsPayload = {
  status?: string;
  data?: RrNotificationApiItem[];
  counts?: UserNotificationsCounts;
  pagination?: UserNotificationsPagination;
};

function unwrapMessage<T extends Record<string, unknown>>(json: unknown): T | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const msg = root.message;
  if (msg && typeof msg === "object") {
    return msg as T;
  }
  return null;
}

export function parseUserNotificationsResponse(json: unknown): {
  payload: UserNotificationsPayload | null;
  raw: unknown;
} {
  const inner = unwrapMessage<UserNotificationsPayload>(json);
  if (inner && Array.isArray(inner.data)) {
    return { payload: inner, raw: json };
  }
  return { payload: null, raw: json };
}

export function formatNotificationTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export async function getUserAllNotifications(input: {
  userEmail: string;
  page?: number;
  limit?: number;
}): Promise<{ ok: boolean; status: number; payload: UserNotificationsPayload | null; raw: unknown }> {
  const qs = new URLSearchParams({
    user_email: input.userEmail.trim(),
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });
  const res = await fetch(`/api/method/get_user_all_notifications?${qs}`, {
    method: "GET",
    credentials: "include",
  });
  const raw: unknown = await res.json().catch(() => ({}));
  const { payload } = parseUserNotificationsResponse(raw);
  return { ok: res.ok, status: res.status, payload, raw };
}

export type MarkReadBody =
  | Record<string, never>
  | { notification_id: string }
  | { notification_id: string[] };

export async function markNotificationAsRead(body: MarkReadBody): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch("/api/method/mark_notification_as_read", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
