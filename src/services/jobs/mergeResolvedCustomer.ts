/**
 * When recommended-job payloads omit `customer`, cards briefly show "—" until RR
 * details resolve. On auto-refresh, `postedTime` / scores can change the row
 * identity enough to replace state even though the job is the same — this
 * re-applies "—" and glitches the UI. Carry forward any non-placeholder company
 * we already had for the same `jobDocumentId`.
 */
export type JobRowWithCustomer = {
  jobDocumentId?: string;
  company: string;
};

export function mergeResolvedCustomerFromPrevious<T extends JobRowWithCustomer>(
  next: T[],
  prev: T[]
): T[] {
  const prevByDoc = new Map<string, string>();
  for (const j of prev) {
    const k = j.jobDocumentId?.trim();
    if (!k) continue;
    const c = j.company?.trim();
    if (c && c !== "—") prevByDoc.set(k, c);
  }
  return next.map((job) => {
    const k = job.jobDocumentId?.trim();
    if (!k) return job;
    const resolved = prevByDoc.get(k);
    if (!resolved) return job;
    const cur = job.company?.trim();
    if (!cur || cur === "—") {
      return { ...job, company: resolved };
    }
    return job;
  });
}
