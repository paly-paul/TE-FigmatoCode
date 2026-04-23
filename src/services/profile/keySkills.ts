"use client";

const KEY_SKILLS_CACHE_PREFIX = "te.keySkills.v1";
const KEY_SKILLS_CACHE_TTL_MS = 30 * 60 * 1000;

function readCachedSkills(profileName: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${KEY_SKILLS_CACHE_PREFIX}:${profileName}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: unknown; skills?: unknown };
    if (typeof parsed.ts !== "number" || !Array.isArray(parsed.skills)) return null;
    if (Date.now() - parsed.ts > KEY_SKILLS_CACHE_TTL_MS) return null;
    return parsed.skills.filter((skill): skill is string => typeof skill === "string" && skill.trim().length > 0);
  } catch {
    return null;
  }
}

function writeCachedSkills(profileName: string, skills: string[]) {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({ ts: Date.now(), skills });
    window.sessionStorage.setItem(`${KEY_SKILLS_CACHE_PREFIX}:${profileName}`, payload);
  } catch {
    // no-op
  }
}

function normalizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  );
}

export async function fetchDynamicKeySkills(profileName: string): Promise<string[]> {
  const normalizedProfileName = profileName.trim();
  if (!normalizedProfileName) return [];

  const cacheHit = readCachedSkills(normalizedProfileName);
  if (cacheHit) return cacheHit;

  const url = new URL("/api/method/generate_keyskills_for_profile", window.location.origin);
  url.searchParams.set("profile_name", normalizedProfileName);

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch key skills (${response.status})`);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const directData = normalizeSkills(payload.data);
  const messageNode =
    payload.message && typeof payload.message === "object"
      ? (payload.message as Record<string, unknown>)
      : null;
  const nestedData = normalizeSkills(messageNode?.data);
  const merged = Array.from(new Set([...directData, ...nestedData]));
  writeCachedSkills(normalizedProfileName, merged);
  return merged;
}

export function prefetchDynamicKeySkills(profileName: string) {
  const normalizedProfileName = profileName.trim();
  if (!normalizedProfileName) return;
  void fetchDynamicKeySkills(normalizedProfileName).catch(() => undefined);
}
