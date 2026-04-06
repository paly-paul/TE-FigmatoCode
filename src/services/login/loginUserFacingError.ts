import { parseApiErrorMessage } from "@/services/signup/parseApiError";

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Turns Frappe / proxy error payloads into short, actionable text for the sign-in form.
 */
export function loginUserFacingErrorMessage(data: Record<string, unknown>): string {
  const raw = stripHtml(parseApiErrorMessage(data));
  const lower = raw.toLowerCase();

  if (!raw || lower === "request failed." || lower === "request failed") {
    return "We couldn't sign you in. Check your email and password, then try again.";
  }

  if (
    lower.includes("invalid login") ||
    lower.includes("incorrect password") ||
    lower.includes("wrong password") ||
    lower.includes("invalid password") ||
    lower.includes("could not authenticate") ||
    lower.includes("could not log in") ||
    lower.includes("authentication failed") ||
    lower.includes("invalid credentials")
  ) {
    return "That email and password don't match our records. Try again, or use Forgot password below.";
  }

  if (lower.includes("login failed")) {
    return "That email and password don't match our records. Try again, or use Forgot password below.";
  }

  if (lower.includes("disabled") || lower.includes("deactivated") || lower.includes("inactive user")) {
    return "This account can't be used to sign in. Contact support if you think that's a mistake.";
  }

  if (
    (lower.includes("not found") || lower.includes("does not exist")) &&
    (lower.includes("user") || lower.includes("email"))
  ) {
    return "We couldn't find an account for that email. Check the spelling or create an account.";
  }

  if (lower.includes("too many") || lower.includes("rate limit") || lower.includes("temporarily blocked")) {
    return "Too many sign-in attempts. Please wait a few minutes, then try again.";
  }

  if (
    lower.includes("traceback") ||
    lower.includes("file \"") ||
    lower.startsWith("frappe.") ||
    lower.includes("authenticationerror") ||
    lower.includes("validationerror")
  ) {
    return "We couldn't sign you in. Check your email and password, then try again.";
  }

  if (raw.length <= 140 && !/\n/.test(raw)) {
    return raw;
  }

  return "We couldn't sign you in. Check your email and password, then try again.";
}
