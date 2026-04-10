import { parseApiErrorMessage } from "@/services/signup/parseApiError";

export interface SaveProfilePayload {
  profile?: string | Record<string, unknown>;
  profile_name?: string;
  profile_id?: string;
  full_name: string;
  email: string;
  professional_title?: string;
  total_experience?: number;
  current_location?: string;
  key_skills?: Array<{ key_skill: string }>;
  education_details?: Array<{
    degree?: string;
    institution?: string;
    year?: string;
  }>;
  work_experience?: Array<{
    company?: string;
    role?: string;
    from_date?: string;
    to_date?: string;
  }>;
  profile_doc?: Record<string, unknown>;
  profile_version?: Record<string, unknown>;
  action?: "save" | "submit";
  [key: string]: unknown;
}

export async function saveProfile(payload: SaveProfilePayload): Promise<Record<string, unknown>> {
  const res = await fetch("/api/method/create_edit_profile/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  if (typeof data.error === "string" && data.error) {
    throw new Error(data.error);
  }

  return data;
}
