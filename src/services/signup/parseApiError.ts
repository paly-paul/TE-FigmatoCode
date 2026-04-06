/** Pull a human-readable message from API JSON (Frappe / generic). */
export function parseApiErrorMessage(data: Record<string, unknown>): string {
  if (typeof data.error === "string" && data.error) return data.error;

  const msg = data.message;
  if (typeof msg === "string" && msg) return msg;
  if (msg && typeof msg === "object" && msg !== null) {
    const m = (msg as { message?: string }).message;
    if (typeof m === "string" && m) return m;
  }

  if (typeof data.exc === "string" && data.exc) {
    const lines = data.exc.trim().split("\n");
    return lines[lines.length - 1] || data.exc;
  }

  if (typeof data._server_messages === "string") {
    try {
      const arr = JSON.parse(data._server_messages) as string[];
      if (Array.isArray(arr) && arr[0]) {
        const inner = JSON.parse(arr[0]) as { message?: string };
        if (typeof inner.message === "string") return inner.message;
      }
    } catch {
      /* ignore */
    }
  }

  return "Request failed.";
}
