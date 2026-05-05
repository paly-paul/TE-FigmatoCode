import type { LocationOption } from "@/components/ui/LocationDrawer";

let cachedPromise: Promise<LocationOption[]> | null = null;

export function getAllLocationOptions(): Promise<LocationOption[]> {
  if (!cachedPromise) {
    cachedPromise = fetchAllLocationOptions().catch((err) => {
      cachedPromise = null;
      throw err;
    });
  }
  return cachedPromise;
}

async function fetchAllLocationOptions(): Promise<LocationOption[]> {
  const byId = new Map<string, string>();
  const maxPages = 20;
  const perPage = 200;

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL("/api/method/get_location_details", window.location.origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(perPage));
    const res = await fetch(url.toString(), { method: "GET", credentials: "same-origin" });
    if (!res.ok) break;
    const json = (await res.json()) as { data?: Array<{ id?: string; label?: string }> };
    const rows = Array.isArray(json.data) ? json.data : [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const id = (row.id ?? "").trim();
      const label = (row.label ?? "").trim();
      if (!id || !label) continue;
      byId.set(id, label);
    }

    if (rows.length < perPage) break;
  }

  return Array.from(byId.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
