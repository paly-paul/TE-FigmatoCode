import { parseApiErrorMessage } from "./parseApiError";

const DUMMY_OTP = "12345";
const OTP_DEV_MODE_KEY = "te_signup_otp_dev_mode";

type SendOtpResponse = {
  status?: string;
  message?: string;
  otp_required?: number;
  isMock?: boolean;
};

type VerifyOtpResponse = {
  status?: string;
  message?: string;
  verified?: number;
};

type SendSignupOtpOptions = {
  allowExistingUser?: boolean;
};

function normalizeRoot(data: Record<string, unknown>): Record<string, unknown> {
  const msg = data.message;
  if (msg && typeof msg === "object") {
    return msg as Record<string, unknown>;
  }
  return data;
}

function getOtpRequired(data: Record<string, unknown>): number | undefined {
  const root = normalizeRoot(data);
  const value = root.otp_required;
  return typeof value === "number" ? value : undefined;
}

function readStringField(data: Record<string, unknown>, key: string): string {
  const root = normalizeRoot(data);
  const value = root[key];
  return typeof value === "string" ? value : "";
}

function readStatus(data: Record<string, unknown>): string {
  const root = normalizeRoot(data);
  const value = root.status;
  return typeof value === "string" ? value.toLowerCase() : "";
}

function isExistingUserMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("already exists") || lower.includes("please login");
}

function setOtpDevMode(email: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    OTP_DEV_MODE_KEY,
    JSON.stringify({ email: email.trim().toLowerCase(), otp: DUMMY_OTP })
  );
}

function clearOtpDevMode(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(OTP_DEV_MODE_KEY);
}

function isOtpDevModeValid(email: string, otp: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(OTP_DEV_MODE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { email?: string; otp?: string };
    return (
      parsed?.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
      parsed?.otp?.trim() === otp.trim()
    );
  } catch {
    return false;
  }
}

export async function sendCandidateSignupOtp(
  email: string,
  options?: SendSignupOtpOptions
): Promise<SendOtpResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  const res = await fetch("/api/method/send_candidate_signup_otp", {
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
    const message = parseApiErrorMessage(data) || `Request failed (${res.status})`;
    if (options?.allowExistingUser && isExistingUserMessage(message)) {
      return {
        status: "success",
        message: "OTP flow accepted for existing account.",
        otp_required: 1,
        isMock: false,
      };
    }
    throw new Error(message);
  }

  const status = readStatus(data);
  if (status === "error") {
    const message = parseApiErrorMessage(data);
    if (options?.allowExistingUser && isExistingUserMessage(message)) {
      return {
        status: "success",
        message: "OTP flow accepted for existing account.",
        otp_required: 1,
        isMock: false,
      };
    }
    throw new Error(message);
  }

  const otpRequired = getOtpRequired(data);
  if (otpRequired !== 1) {
    setOtpDevMode(normalizedEmail);
    return {
      status: "success",
      otp_required: 1,
      message: "Using temporary dummy OTP (12345) until backend OTP is enabled.",
      isMock: true,
    };
  }

  clearOtpDevMode();
  return {
    status: typeof data.status === "string" ? data.status : "success",
    message: readStringField(data, "message"),
    otp_required: otpRequired,
    isMock: false,
  };
}

export async function verifyCandidateSignupOtp(email: string, otp: string): Promise<VerifyOtpResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  if (isOtpDevModeValid(normalizedEmail, otp)) {
    clearOtpDevMode();
    return {
      status: "success",
      message: "OTP verified successfully (dummy mode).",
      verified: 1,
    };
  }

  const res = await fetch("/api/method/verify_candidate_signup_otp", {
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

  const status = readStatus(data);
  if (status === "error") {
    throw new Error(parseApiErrorMessage(data));
  }

  const root = normalizeRoot(data);
  const verified = typeof root.verified === "number" ? root.verified : 0;
  if (verified !== 1) {
    throw new Error("Invalid OTP.");
  }

  clearOtpDevMode();

  return data as VerifyOtpResponse;
}
