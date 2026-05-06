function toErrorMessage(data: Record<string, unknown>): string {
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (data.message && typeof data.message === "object") {
    const nested = data.message as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) return nested.message.trim();
  }
  return "Unable to update job search status.";
}

async function postJobSearchStatus(url: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(url, {
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

export async function postJobPause(payload: {
  profile_id: string;
  job_search_status: "Paused";
  is_open_to_opportunities: 0;
  pause_duration: string;
  resume_date: string;
  updated_at: string;
}): Promise<void> {
  await postJobSearchStatus("/api/method/post_job_pause", payload);
}

export async function activateJobSearch(payload: { profile_id: string }): Promise<void> {
  await postJobSearchStatus("/api/method/activate_job_search", payload);
}
