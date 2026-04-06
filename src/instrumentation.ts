/**
 * Runs once when the Node server starts (e.g. `next dev`, `next start`).
 * This app does not open a database socket — it uses Frappe at BACKEND_URL.
 * The log reflects whether that backend is reachable from this server.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.SKIP_BACKEND_HEALTHCHECK === "1") {
    console.log(
      "[TalentEngine] Backend connectivity check skipped (SKIP_BACKEND_HEALTHCHECK=1)."
    );
    return;
  }

  const base = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!base) {
    console.warn(
      "[TalentEngine] Backend / data: NOT CONFIGURED — BACKEND_URL is unset. " +
        "API routes cannot reach Frappe (where the real DB lives)."
    );
    return;
  }

  console.log(`[TalentEngine] Checking Frappe backend: ${base}`);

  try {
    const res = await fetch(base, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "TE-FigmatoCode-connectivity-check/1.0" },
    });
    console.log(
      `[TalentEngine] Backend / data: CONNECTED (HTTP ${res.status}). ` +
        "Persistent data is on the Frappe server, not inside Next.js."
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[TalentEngine] Backend / data: NOT REACHABLE (${message}). ` +
        "Fix BACKEND_URL or network; API routes will fail until the backend responds."
    );
  }
}
