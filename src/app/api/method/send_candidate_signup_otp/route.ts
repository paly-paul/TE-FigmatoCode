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

  // Development/testing override: bypass real email delivery when forced.
  // The client treats `otp_required !== 1` as dummy-OTP mode.
  const forceSignupOtp =
    typeof process.env.FORCE_SIGNUP_OTP === "string" &&
    ["1", "true", "yes", "on"].includes(process.env.FORCE_SIGNUP_OTP.trim().toLowerCase());
  if (forceSignupOtp) {
    return NextResponse.json(
      {
        status: "success",
        message: "FORCE_SIGNUP_OTP is enabled. Use OTP 12345.",
        otp_required: 0,
      },
      { status: 200 }
    );
  }

  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { status: "error", message: "BACKEND_URL is not set. Cannot send OTP in local mock mode." },
      { status: 503 }
    );
  }

  const url = `${backendBase}/api/method/te_frappe_6fe.api.otp.send_candidate_signup_otp`;
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
