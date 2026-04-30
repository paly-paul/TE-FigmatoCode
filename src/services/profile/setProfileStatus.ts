import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type JsonRecord = Record<string, unknown>;

function pickString(input: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export async function setProfileStatus(profileId: string, active: boolean): Promise<string> {
  const res = await fetch("/api/method/set_profile_status/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile_id: profileId.trim(),
      status: active ? "Active" : "In Active",
    }),
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
    throw new Error(parseApiErrorMessage(data) || "Unable to update profile status.");
  }

  const dataNode =
    payload.data && typeof payload.data === "object" ? (payload.data as JsonRecord) : payload;
  return pickString(dataNode, "profile_status") ?? (active ? "Active" : "In Active");
}
