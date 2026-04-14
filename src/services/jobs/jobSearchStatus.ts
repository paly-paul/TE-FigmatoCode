type PauseDuration = {
  value: number;
  unit: "MONTHS";
};

export type JobSearchStatusPayload = {
  userId: string;
  jobSearchStatus: "ACTIVE" | "PAUSED";
  isOpenToOpportunities: boolean;
  pauseDuration: PauseDuration | null;
  resumeDate?: string;
  updatedAt: string;
};

function toErrorMessage(data: Record<string, unknown>): string {
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (data.message && typeof data.message === "object") {
    const nested = data.message as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) return nested.message.trim();
  }
  return "Unable to update job search status.";
}

export async function updateJobSearchStatus(payload: JobSearchStatusPayload): Promise<void> {
  const res = await fetch("/api/method/update_job_search_status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore non-JSON
  }

  if (!res.ok) {
    throw new Error(toErrorMessage(data));
  }
}
