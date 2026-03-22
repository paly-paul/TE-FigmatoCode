export const DASHBOARD_WELCOME_PENDING_KEY = "te_dashboardWelcomePending";

/** Static display name until profile is backed by an API. */
export const STATIC_NAV_DISPLAY_NAME = "Adam Smith";

export function setDashboardWelcomePending() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DASHBOARD_WELCOME_PENDING_KEY, "1");
  } catch {
    // ignore
  }
}
