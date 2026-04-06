import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

async function safeJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as JsonRecord;
  } catch {
    return { raw: text };
  }
}

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const loggedUserUrl = `${backendBase}/api/method/frappe.auth.get_logged_user`;
  const sessionUrl = `${backendBase}/api/method/frappe.auth.get_logged_user`;

  const loggedUserRes = await fetch(loggedUserUrl, { method: "GET", headers });
  const loggedUserData = await safeJson(loggedUserRes);

  // Also check if Profile lookup by email works (uses same auth path as resolve_profile_name)
  const email =
    (() => {
      const { searchParams } = new URL(request.url);
      const q = searchParams.get("email");
      if (q && q.trim()) return q.trim();
      // fallback: try cookie user_id
      const match = cookie?.match(/(?:^|;\s*)user_id=([^;]+)/);
      return match?.[1] ? decodeURIComponent(match[1]).trim() : "";
    })() || "";

  let profileLookup: { status: number; ok: boolean; url: string; data: JsonRecord } | null = null;
  if (email) {
    const url = `${backendBase}/api/method/get_profile_by_email?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { method: "GET", headers });
    const data = await safeJson(res);
    profileLookup = { status: res.status, ok: res.ok, url, data };
  }

  const out = NextResponse.json(
    {
      backendBase,
      hasAuthorizationHeader: Boolean(auth),
      hasCookie: Boolean(cookie),
      loggedUser: {
        status: loggedUserRes.status,
        ok: loggedUserRes.ok,
        url: loggedUserUrl,
        data: loggedUserData,
      },
      profileLookup,
      note:
        "If loggedUser is not ok or returns Guest/empty, your session cookie/token is not accepted by the backend. If profileLookup fails (401/403), your user lacks permission to read Profile or the token is missing.",
    },
    { status: 200 }
  );

  out.headers.set("x-upstream-logged-user", loggedUserUrl);
  out.headers.set("x-upstream-session", sessionUrl);
  return out;
}

