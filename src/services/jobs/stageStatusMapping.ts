function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractCandidateStageNames(raw: unknown): string[] {
  const data =
    isRecord(raw) && isRecord(raw.message) && Array.isArray((raw.message as Record<string, unknown>).data)
      ? ((raw.message as Record<string, unknown>).data as unknown[])
      : Array.isArray(raw)
        ? raw
        : [];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    const stage = item.candidate_stage_name;
    if (typeof stage === "string" && stage.trim() && !seen.has(stage.trim())) {
      seen.add(stage.trim());
      result.push(stage.trim());
    }
  }
  return result.sort();
}

export async function getStageStatusMapping(): Promise<string[]> {
  const res = await fetch(
    "/api/method/get_rr_candidate_stage_status_mapping",
    { credentials: "same-origin" }
  );
  if (!res.ok) return [];
  try {
    const data: unknown = await res.json();
    return extractCandidateStageNames(data);
  } catch {
    return [];
  }
}
