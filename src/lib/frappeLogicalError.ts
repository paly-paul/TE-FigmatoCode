/**
 * Detect Frappe / ERPNext JSON responses that represent failures.
 * Frappe often uses a string `message` for auth errors, which plain
 * `{ message: { status: "error" } }` checks miss.
 */
export function hasFrappeLogicalError(data: Record<string, unknown>): boolean {
  if (typeof data.error === "string" && data.error.trim()) return true;
  if (typeof data.exc === "string" && data.exc.trim()) return true;
  if (typeof data._server_messages === "string" && data._server_messages.trim()) return true;

  const topLevelStatus = data.status;
  if (typeof topLevelStatus === "string" && topLevelStatus.toLowerCase() === "error") {
    return true;
  }

  const message = data.message;
  if (typeof message === "string" && isLikelyFrappeFailureString(message)) return true;
  if (Array.isArray(message)) {
    const joined = message.map(String).join(" ");
    if (isLikelyFrappeFailureString(joined)) return true;
  }

  if (message && typeof message === "object") {
    const nestedStatus = (message as { status?: unknown }).status;
    if (typeof nestedStatus === "string" && nestedStatus.toLowerCase() === "error") {
      return true;
    }
  }

  return false;
}

function isLikelyFrappeFailureString(text: string): boolean {
  const m = text.toLowerCase().trim();
  if (!m) return false;
  if (m === "logged in" || m === "ok" || m === "success") return false;

  const hints = [
    "invalid login",
    "invalid password",
    "incorrect password",
    "wrong password",
    "authentication failed",
    "could not authenticate",
    "could not log in",
    "user disabled",
    "access denied",
    "not permitted",
    "verification failed",
    "login failed",
  ];
  return hints.some((h) => m.includes(h));
}
