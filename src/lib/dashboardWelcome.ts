export const DASHBOARD_WELCOME_PENDING_KEY = "te_dashboardWelcomePending";

export function setDashboardWelcomePending() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DASHBOARD_WELCOME_PENDING_KEY, "1");
  } catch {
    // ignore
  }
}
