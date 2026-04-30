import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type JsonRecord = Record<string, unknown>;

export interface DownloadProfileResumeResult {
  fileName?: string;
  downloadUrl: string;
  raw: JsonRecord;
}

function pickString(input: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export async function downloadProfileResume(profileName: string): Promise<DownloadProfileResumeResult> {
  const res = await fetch("/api/method/generate_profile_resume/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile_name: profileName.trim() }),
  });

  let data: JsonRecord = {};
  try {
    data = (await res.json()) as JsonRecord;
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  const message = data.message;
  const payload = message && typeof message === "object" ? (message as JsonRecord) : data;
  const status = pickString(payload, "status")?.toLowerCase();
  if (status === "failed" || status === "error") {
    throw new Error(parseApiErrorMessage(data) || "Unable to generate profile resume.");
  }

  const downloadUrl = pickString(payload, "download_url", "profile_download", "file_url");
  if (!downloadUrl) {
    throw new Error("Resume link was not returned by generate_profile_resume.");
  }

  return {
    fileName: pickString(payload, "file_name"),
    downloadUrl,
    raw: data,
  };
}
