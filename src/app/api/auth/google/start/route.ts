import { NextResponse } from "next/server";

export async function GET() {
  const backendBase =
    process.env.BACKEND_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_FRAPPE_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    "";
  if (!clientId) {
    return NextResponse.json({ error: "Google client id is not set." }, { status: 503 });
  }

  const successRedirect = process.env.NEXT_PUBLIC_AUTH_SUCCESS_REDIRECT?.trim() || "/auth-callback";

  const state = Buffer.from(successRedirect, "utf8").toString("base64");
  const configuredRedirectUri =
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI?.trim() || process.env.GOOGLE_REDIRECT_URI?.trim() || "";
  const frappeRedirectUri = (configuredRedirectUri || `${backendBase}/api/method/candidate_google_login`).replace(/\/$/, "");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: frappeRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.json({ url }, { status: 200 });
}

