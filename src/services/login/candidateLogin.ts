import type { CandidateLoginValues } from "./types";
import { hasFrappeLogicalError } from "@/lib/frappeLogicalError";
import { loginUserFacingErrorMessage } from "@/services/login/loginUserFacingError";

function toPayload(values: CandidateLoginValues) {
  return {
    email: values.email.trim(),
    password: values.password,
  };
}

/** Calls the app API route which forwards to the backend candidate_login method. */
export async function candidateLogin(values: CandidateLoginValues): Promise<Record<string, unknown>> {
  const res = await fetch("/api/method/candidate_login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPayload(values)),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON body */
  }

  if (!res.ok || hasFrappeLogicalError(data)) {
    throw new Error(loginUserFacingErrorMessage(data) || `Something went wrong (${res.status}). Please try again.`);
  }

  return data;
}