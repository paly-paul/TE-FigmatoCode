function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function stableJobNumericId(value: string): number {
  const normalized = value.trim();
  if (!normalized) return 0;
  return hashString(normalized);
}

export function slugifyLocationId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "unknown-location";

  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "unknown-location";
}
