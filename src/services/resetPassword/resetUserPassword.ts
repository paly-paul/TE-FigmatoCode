import { parseApiErrorMessage } from "@/services/signup/parseApiError";

export async function resetUserPassword(email: string, newPassword: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const new_password = newPassword.trim();

  const res = await fetch("/api/method/reset_user_password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizedEmail, new_password }),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore non-JSON
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  if (typeof data.status === "string" && data.status.toLowerCase() === "error") {
    throw new Error(parseApiErrorMessage(data));
  }
}

