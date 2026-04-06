import type { CreateUserAndCandidatePayload, SignupFormValues } from "./types";
import { parseApiErrorMessage } from "./parseApiError";

function toPayload(values: SignupFormValues): CreateUserAndCandidatePayload {
  const first = values.firstName.trim();
  const last = values.lastName.trim();
  return {
    email: values.email.trim(),
    first_name: first,
    last_name: last,
    name: `${first} ${last}`,
    password: values.password,
  };
}

/**
 * Calls the app API route, which forwards to the backend (see route handler).
 * Uses same-origin `/api/method/create_user_and_candidate`.
 */
export async function createUserAndCandidate(
  values: SignupFormValues
): Promise<Record<string, unknown>> {
  const res = await fetch("/api/method/create_user_and_candidate", {
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

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  // Frappe sometimes returns 200 with `exc` set on failure
  if (typeof data.exc === "string" && data.exc) {
    throw new Error(parseApiErrorMessage(data));
  }

  return data;
}
