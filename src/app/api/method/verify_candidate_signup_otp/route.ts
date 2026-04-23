import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON body." }, { status: 400 });
  }

  const emailRaw = typeof body.email === "string" ? body.email : "";
  const otpRaw = typeof body.otp === "string" ? body.otp : "";
  const email = emailRaw.trim().toLowerCase();
  const otp = otpRaw.trim();
  if (!email || !otp) {
    return NextResponse.json({ status: "error", message: "Email and OTP are required" }, { status: 400 });
  }

  const forceSignupOtp =
    typeof process.env.FORCE_SIGNUP_OTP === "string" &&
    ["1", "true", "yes", "on"].includes(process.env.FORCE_SIGNUP_OTP.trim().toLowerCase());
  if (forceSignupOtp) {
    if (otp === "12345") {
      return NextResponse.json({
        status: "success",
        message: "OTP verified successfully (forced dev mode).",
        verified: 1,
      });
    }
    return NextResponse.json(
      { status: "error", message: "Invalid OTP for forced dev mode." },
      { status: 400 }
    );
  }

  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { status: "error", message: "BACKEND_URL is not set. Cannot verify OTP in local mock mode." },
      { status: 503 }
    );
  }

  const url = `${backendBase}/api/method/te_frappe_6fe.api.otp.verify_candidate_signup_otp`;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;

  const upstream = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, otp }),
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
