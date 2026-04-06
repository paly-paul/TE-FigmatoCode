import { getUserDisplayName } from "@/lib/authSession";
import { getSessionLoginEmail } from "@/lib/profileOnboarding";

const FALLBACK = "User";

/**
 * Name shown in the navbar and welcome modal: stored display name from login/signup,
 * else a readable fallback from the logged-in email, else a generic label.
 */
export function getResolvedNavDisplayName(): string {
  if (typeof window === "undefined") return FALLBACK;

  const stored = getUserDisplayName();
  if (stored) return stored;

  const email = getSessionLoginEmail();
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) {
      const humanized = local.replace(/[._-]+/g, " ").trim();
      if (humanized) {
        return humanized.charAt(0).toUpperCase() + humanized.slice(1);
      }
    }
  }

  return FALLBACK;
}
