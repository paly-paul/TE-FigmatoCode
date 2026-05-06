import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON body." }, { status: 400 });
  }

  const emailRaw = typeof body.email === "string" ? body.email : "";
  const email = emailRaw.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ status: "error", message: "Email is required" }, { status: 400 });
  }

  const forceResetPwdOtp =
    typeof process.env.FORCE_RESET_PASSWORD_OTP === "string" &&
    ["1", "true", "yes", "on"].includes(process.env.FORCE_RESET_PASSWORD_OTP.trim().toLowerCase());
  if (forceResetPwdOtp) {
    return NextResponse.json(
      {
        status: "success",
        message: "FORCE_RESET_PASSWORD_OTP is enabled. Use OTP 12345.",
        otp_required: 1,
      },
      { status: 200 }
    );
  }

  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { status: "error", message: "BACKEND_URL is not set. Cannot send reset password OTP." },
      { status: 503 }
    );
  }

  // Frappe requires the full dotted path; bare `send_reset_password_otp` is not a whitelisted command name.
  const methodPath =
    process.env.BACKEND_SEND_RESET_PASSWORD_METHOD?.trim() ||
    "te_frappe_6fe.api.otp.send_reset_password_otp";
  const url = `${backendBase}/api/method/${encodeURI(methodPath)}`;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;

  const upstream = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  });

  const text = await upstream.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { status: "error", message: text || "Unknown error" };
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", url);
  return res;
}

