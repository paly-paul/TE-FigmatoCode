import { parseApiErrorMessage } from "@/services/signup/parseApiError";

export async function uploadProfileFile(file: File): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const res = await fetch("/api/method/upload_file", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    body: formData,
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Upload failed (${res.status})`);
  }

  const message = data.message;
  if (
    message &&
    typeof message === "object" &&
    typeof (message as { status?: unknown }).status === "string" &&
    (message as { status: string }).status.toLowerCase() === "error"
  ) {
    throw new Error(parseApiErrorMessage(data));
  }

  return data;
}

