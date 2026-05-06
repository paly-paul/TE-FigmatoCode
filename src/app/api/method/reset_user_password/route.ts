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
  const newPasswordRaw = typeof body.new_password === "string" ? body.new_password : "";
  const new_password = newPasswordRaw.trim();

  if (!email) {
    return NextResponse.json({ status: "error", message: "Email is required" }, { status: 400 });
  }
  if (!new_password) {
    return NextResponse.json({ status: "error", message: "New password is required" }, { status: 400 });
  }

  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { status: "error", message: "BACKEND_URL is not set. Cannot reset user password." },
      { status: 503 }
    );
  }

  const methodPath = process.env.BACKEND_RESET_USER_PASSWORD_METHOD?.trim() || "reset_user_password";
  const url = `${backendBase}/api/method/${encodeURI(methodPath)}`;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;

  const upstream = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, new_password }),
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

