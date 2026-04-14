"use client";

import type { RecommendedJobApi } from "@/services/jobs/types";

const RECOMMENDED_JOBS_CACHE_PREFIX = "te_recommended_jobs_cache_v1";
const RECOMMENDED_JOBS_TTL_MS = 6 * 60 * 60 * 1000;

type RecommendedJobsCacheEntry = {
  profileName: string;
  fetchedAt: number;
  jobs: RecommendedJobApi[];
};

function cacheKey(profileName: string): string {
  return `${RECOMMENDED_JOBS_CACHE_PREFIX}:${profileName.trim()}`;
}

export function readRecommendedJobsCache(profileName: string): RecommendedJobsCacheEntry | null {
  if (typeof window === "undefined") return null;
  const key = cacheKey(profileName);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecommendedJobsCacheEntry;
    if (!Array.isArray(parsed.jobs) || typeof parsed.fetchedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeRecommendedJobsCache(profileName: string, jobs: RecommendedJobApi[]): void {
  if (typeof window === "undefined") return;
  const key = cacheKey(profileName);
  const payload: RecommendedJobsCacheEntry = {
    profileName: profileName.trim(),
    fetchedAt: Date.now(),
    jobs,
  };
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}

export function isRecommendedJobsCacheStale(profileName: string): boolean {
  const cache = readRecommendedJobsCache(profileName);
  if (!cache) return true;
  return Date.now() - cache.fetchedAt > RECOMMENDED_JOBS_TTL_MS;
}

export function clearAllRecommendedJobsCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${RECOMMENDED_JOBS_CACHE_PREFIX}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore storage failures
  }
}
