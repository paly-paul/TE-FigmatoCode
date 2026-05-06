import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type SendResetPasswordOtpResponse = {
  status?: string;
  message?: string;
  otp_required?: number;
};

function normalizeRoot(data: Record<string, unknown>): Record<string, unknown> {
  const msg = data.message;
  if (msg && typeof msg === "object" && !Array.isArray(msg)) {
    return msg as Record<string, unknown>;
  }
  return data;
}

function getOtpRequired(data: Record<string, unknown>): number | undefined {
  const root = normalizeRoot(data);
  const value = root.otp_required ?? data.otp_required;
  return typeof value === "number" ? value : undefined;
}

function readStringTopLevelMessage(data: Record<string, unknown>): string {
  const m = data.message;
  if (typeof m === "string") return m;
  return "";
}

function readStatus(data: Record<string, unknown>): string {
  const root = normalizeRoot(data);
  const value = root.status ?? data.status;
  return typeof value === "string" ? value.toLowerCase() : "";
}

/**
 * Forgot password step 1: sends OTP via `send_reset_password`.
 */
export async function sendResetPasswordOtp(email: string): Promise<SendResetPasswordOtpResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  const res = await fetch("/api/method/send_reset_password_otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizedEmail }),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore non-JSON
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  const status = readStatus(data);
  if (status === "error") {
    throw new Error(parseApiErrorMessage(data));
  }

  const message = readStringTopLevelMessage(data) || "OTP sent to email.";

  return {
    status: typeof data.status === "string" ? data.status : "success",
    message,
    otp_required: getOtpRequired(data),
  };
}

function isSuccessfulVerifyPayload(data: Record<string, unknown>): boolean {
  if (typeof data.exc === "string" && data.exc.trim()) return false;
  const root = normalizeRoot(data);
  if (typeof root.exc === "string" && root.exc.trim()) return false;
  const st = readStatus(data);
  if (st === "error") return false;
  const rootStatus = typeof root.status === "string" ? root.status.toLowerCase() : "";
  if (rootStatus === "error") return false;
  return true;
}

/**
 * Forgot password step 2: verifies OTP via `verify_reset_password_otp`.
 * Backend may respond with `{ "message": {} }` on success.
 */
export async function verifyResetPasswordOtp(email: string, otp: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const res = await fetch("/api/method/verify_reset_password_otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizedEmail, otp: otp.trim() }),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore non-JSON
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  if (!isSuccessfulVerifyPayload(data)) {
    throw new Error(parseApiErrorMessage(data) || "Invalid OTP.");
  }
}
