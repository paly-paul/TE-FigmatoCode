import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type CurrencyListPayload = {
  message?: {
    data?: unknown[];
  };
};

function toCurrencyCode(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const row = item as Record<string, unknown>;

  const direct =
    (typeof row.name === "string" && row.name.trim()) ||
    (typeof row.currency_name === "string" && row.currency_name.trim()) ||
    "";

  return direct ? direct.trim() : "";
}

export async function getCurrencyListOptions(): Promise<string[]> {
  const res = await fetch("/api/method/get_currency_list", { credentials: "same-origin" });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(payload) || `Request failed (${res.status})`);
  }

  const parsed = payload as CurrencyListPayload;
  const rows = Array.isArray(parsed.message?.data) ? parsed.message?.data ?? [] : [];
  return Array.from(new Set(rows.map((item) => toCurrencyCode(item)).filter(Boolean)));
}
