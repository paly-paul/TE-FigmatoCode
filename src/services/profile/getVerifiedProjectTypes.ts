import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type VerifiedProjectTypesPayload = {
  message?: {
    data?: unknown[];
  };
};

function toIndustryName(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const row = item as Record<string, unknown>;
  const direct =
    (typeof row.project_type_name === "string" && row.project_type_name.trim()) ||
    (typeof row.name === "string" && row.name.trim()) ||
    "";
  return direct ? direct.trim() : "";
}

export async function getVerifiedProjectTypeOptions(): Promise<string[]> {
  const res = await fetch("/api/method/get_verified_project_types", { credentials: "same-origin" });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(payload) || `Request failed (${res.status})`);
  }

  const parsed = payload as VerifiedProjectTypesPayload;
  const rows = Array.isArray(parsed.message?.data) ? parsed.message?.data ?? [] : [];
  return Array.from(new Set(rows.map((item) => toIndustryName(item)).filter(Boolean)));
}
