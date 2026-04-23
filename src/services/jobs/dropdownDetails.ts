import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type DropdownDetailsResponse = {
  data?: {
    options?: unknown[];
  };
};

const DROPDOWN_CACHE_KEY = "te.dropdownDetailsCache.v1";
const DROPDOWN_CACHE_TTL_MS = 30 * 60 * 1000;
const dropdownMemoryCache = new Map<string, { value: string[]; ts: number }>();
const inflightDropdownRequests = new Map<string, Promise<string[]>>();

function getCacheKey(input: {
  doctype: string;
  fieldName: string;
  page?: number;
  limit?: number;
  search?: string;
}): string {
  return JSON.stringify({
    doctype: input.doctype.trim(),
    fieldName: input.fieldName.trim(),
    page: input.page ?? 1,
    limit: input.limit ?? 1000,
    search: input.search?.trim().toLowerCase() ?? "",
  });
}

function readSessionCache(cacheKey: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DROPDOWN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { value?: unknown; ts?: unknown }>;
    const entry = parsed?.[cacheKey];
    if (!entry || !Array.isArray(entry.value) || typeof entry.ts !== "number") return null;
    if (Date.now() - entry.ts > DROPDOWN_CACHE_TTL_MS) return null;
    return entry.value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return null;
  }
}

function writeSessionCache(cacheKey: string, value: string[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(DROPDOWN_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, { value: string[]; ts: number }>) : {};
    parsed[cacheKey] = { value, ts: Date.now() };
    window.sessionStorage.setItem(DROPDOWN_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // best-effort cache write
  }
}

function toOptionLabel(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const row = item as Record<string, unknown>;

  const direct =
    (typeof row.label === "string" && row.label.trim()) ||
    (typeof row.title === "string" && row.title.trim()) ||
    (typeof row.value === "string" && row.value.trim()) ||
    (typeof row.name === "string" && row.name.trim()) ||
    "";
  return direct ? direct.trim() : "";
}

export async function getDropdownDetailsOptions(input: {
  doctype: string;
  fieldName: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<string[]> {
  const cacheKey = getCacheKey(input);
  const memoryHit = dropdownMemoryCache.get(cacheKey);
  if (memoryHit && Date.now() - memoryHit.ts <= DROPDOWN_CACHE_TTL_MS) {
    return memoryHit.value;
  }

  const sessionHit = readSessionCache(cacheKey);
  if (sessionHit && sessionHit.length > 0) {
    dropdownMemoryCache.set(cacheKey, { value: sessionHit, ts: Date.now() });
    return sessionHit;
  }

  const pending = inflightDropdownRequests.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const url = new URL("/api/method/get_dropdown_details", window.location.origin);
    url.searchParams.set("doctype", input.doctype.trim());
    url.searchParams.set("field_name", input.fieldName.trim());
    url.searchParams.set("page", String(input.page ?? 1));
    url.searchParams.set("limit", String(input.limit ?? 1000));
    if (input.search?.trim()) {
      url.searchParams.set("search", input.search.trim());
    }

    const res = await fetch(url.toString(), { credentials: "same-origin" });
    let payload: Record<string, unknown> = {};
    try {
      payload = (await res.json()) as Record<string, unknown>;
    } catch {
      payload = {};
    }

    if (!res.ok) {
      throw new Error(parseApiErrorMessage(payload) || `Request failed (${res.status})`);
    }

    const data = payload.data;
    const parsedData =
      data && typeof data === "object" ? (data as DropdownDetailsResponse["data"]) : undefined;
    const options = Array.isArray(parsedData?.options) ? parsedData?.options ?? [] : [];
    const labels = Array.from(new Set(options.map((item) => toOptionLabel(item)).filter(Boolean)));
    dropdownMemoryCache.set(cacheKey, { value: labels, ts: Date.now() });
    writeSessionCache(cacheKey, labels);
    return labels;
  })();

  inflightDropdownRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    inflightDropdownRequests.delete(cacheKey);
  }
}

export function prefetchDropdownDetailsAfterLogin() {
  if (typeof window === "undefined") return;
  const requests = [
    { doctype: "Resource Requirement", fieldName: "key_skills", limit: 1000 },
    { doctype: "Resource Requirement", fieldName: "qualification", limit: 1000 },
    { doctype: "Resource Requirement", fieldName: "language_requirement", limit: 50 },
    { doctype: "Resource Requirement", fieldName: "project", limit: 1000 },
    { doctype: "Resource Requirement", fieldName: "visa_requirements", limit: 1000 },
    { doctype: "Profile Version", fieldName: "nationality", limit: 1000 },
  ] as const;

  void Promise.all(requests.map((input) => getDropdownDetailsOptions(input).catch(() => [])));
}
