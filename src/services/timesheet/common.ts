import { parseApiErrorMessage } from "@/services/signup/parseApiError";

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function getJsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function unwrapMessage(data: Record<string, unknown>): Record<string, unknown> {
  const message = data.message;
  if (isRecord(message)) return message;
  return data;
}

export function throwHttpIfNeeded(res: Response, data: Record<string, unknown>): void {
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
}
