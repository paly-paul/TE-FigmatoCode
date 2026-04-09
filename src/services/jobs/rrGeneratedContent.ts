import { parseApiErrorMessage } from "@/services/signup/parseApiError";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function getJsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export type RrGeneratedContentApi = {
  rr_name: string;
  job_description_header: string;
  job_description: string;
  advertised_position_header: string;
  advertised_position: string;
};

function parseRrGeneratedContent(payload: Record<string, unknown>): RrGeneratedContentApi {
  const root = isRecord(payload.message) ? payload.message : payload;
  return {
    rr_name: typeof root.rr_name === "string" ? root.rr_name : "",
    job_description_header:
      typeof root.job_description_header === "string" ? root.job_description_header : "",
    job_description: typeof root.job_description === "string" ? root.job_description : "",
    advertised_position_header:
      typeof root.advertised_position_header === "string"
        ? root.advertised_position_header
        : "",
    advertised_position:
      typeof root.advertised_position === "string" ? root.advertised_position : "",
  };
}

export async function getRrGeneratedContent(
  rrName: string
): Promise<RrGeneratedContentApi> {
  const url = new URL("/api/method/get_rr_generated_content", window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rr_name: rrName.trim() }),
  });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  const root = isRecord(data.message) ? data.message : data;
  if (
    typeof root.status === "string" &&
    root.status.toLowerCase() === "error"
  ) {
    throw new Error(
      (typeof root.message === "string" && root.message) || "Could not load job description."
    );
  }
  return parseRrGeneratedContent(data);
}
