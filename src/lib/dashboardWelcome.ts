export const DASHBOARD_WELCOME_PENDING_KEY = "te_dashboardWelcomePending";
const DASHBOARD_LAST_LOGIN_AT_KEY = "te_dashboardLastLoginAt";
const MS_IN_DAY = 24 * 60 * 60 * 1000;

type SetDashboardWelcomePendingOptions = {
  force?: boolean;
  inactivityDays?: number;
};

export function setDashboardWelcomePending(options?: SetDashboardWelcomePendingOptions) {
  if (typeof window === "undefined") return;
  const force = options?.force === true;
  const inactivityDays = options?.inactivityDays ?? 45;
  try {
    const now = Date.now();
    const previousLoginRaw = window.localStorage.getItem(DASHBOARD_LAST_LOGIN_AT_KEY);
    const previousLoginAt = previousLoginRaw ? Number.parseInt(previousLoginRaw, 10) : Number.NaN;
    const isFirstLogin = !Number.isFinite(previousLoginAt);
    const inactivityThresholdMs = inactivityDays * MS_IN_DAY;
    const hasCrossedInactivityWindow =
      Number.isFinite(previousLoginAt) && now - previousLoginAt >= inactivityThresholdMs;

    if (force || isFirstLogin || hasCrossedInactivityWindow) {
      window.sessionStorage.setItem(DASHBOARD_WELCOME_PENDING_KEY, "1");
    } else {
      window.sessionStorage.removeItem(DASHBOARD_WELCOME_PENDING_KEY);
    }

    window.localStorage.setItem(DASHBOARD_LAST_LOGIN_AT_KEY, String(now));
  } catch {
    if (force) {
      try {
        window.sessionStorage.setItem(DASHBOARD_WELCOME_PENDING_KEY, "1");
      } catch {
        // ignore
      }
    }
  }
}
