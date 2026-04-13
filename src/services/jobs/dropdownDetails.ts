import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type DropdownDetailsResponse = {
  data?: {
    options?: unknown[];
  };
};

function toOptionLabel(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const row = item as Record<string, unknown>;

  const direct =
    (typeof row.label === "string" && row.label.trim()) ||
    (typeof row.title === "string" && row.title.trim()) ||
    (typeof row.value === "string" && row.value.trim()) ||
    (typeof row.name === "string" && row.name.trim()) ||
    "";
  return direct ? direct.trim() : "";
}

export async function getDropdownDetailsOptions(input: {
  doctype: string;
  fieldName: string;
  page?: number;
  limit?: number;
}): Promise<string[]> {
  const url = new URL("/api/method/get_dropdown_details", window.location.origin);
  url.searchParams.set("doctype", input.doctype.trim());
  url.searchParams.set("field_name", input.fieldName.trim());
  url.searchParams.set("page", String(input.page ?? 1));
  url.searchParams.set("limit", String(input.limit ?? 1000));

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  let payload: Record<string, unknown> = {};
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(payload) || `Request failed (${res.status})`);
  }

  const data = payload.data;
  const parsedData =
    data && typeof data === "object" ? (data as DropdownDetailsResponse["data"]) : undefined;
  const options = Array.isArray(parsedData?.options) ? parsedData?.options ?? [] : [];
  const labels = options.map((item) => toOptionLabel(item)).filter(Boolean);
  return Array.from(new Set(labels));
}
