import { NextResponse } from "next/server";

interface ExchangeTokenResponse {
  message?: string;
  status?: string;
  user?: string;
  profile?: string;
  home_page?: string;
  full_name?: string;
  email?: string;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const loginToken = typeof body.login_token === "string" ? body.login_token.trim() : "";
  if (!loginToken) {
    return NextResponse.json({ error: "login_token is required." }, { status: 400 });
  }

  const backendBase =
    process.env.BACKEND_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_FRAPPE_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const url = `${backendBase}/api/method/exchange_google_login_token`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login_token: loginToken }),
  });

  const upstreamSetCookies: string[] = (() => {
    const anyHeaders = upstream.headers as any;
    if (typeof anyHeaders.getSetCookie === "function") {
      return anyHeaders.getSetCookie() as string[];
    }
    const single = upstream.headers.get("set-cookie");
    return single ? [single] : [];
  })();

  function normalizeCookieForThisApp(cookie: string) {
    let next = cookie.replace(/;\s*Domain=[^;]+/i, "");
    next = next.replace(/;\s*Path=[^;]+/i, "; Path=/");
    if (!/;\s*Path=/i.test(next)) next = `${next}; Path=/`;
    if (process.env.NODE_ENV !== "production") {
      const hasSameSiteNone = /;\s*SameSite=None\b/i.test(next);
      if (hasSameSiteNone) next = next.replace(/;\s*SameSite=None\b/i, "; SameSite=Lax");
      next = next.replace(/;\s*Secure\b/i, "");
    }
    return next;
  }

  const text = await upstream.text();
  let data: unknown = {};
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    data = { raw: text };
  }

  const withCookies = (payload: unknown, status: number) => {
    const res = NextResponse.json(payload, { status });
    for (const cookie of upstreamSetCookies) {
      res.headers.append("set-cookie", normalizeCookieForThisApp(cookie));
    }
    res.headers.set("x-upstream-url", url);
    return res;
  };

  if (!upstream.ok) {
    return withCookies({ error: "Token exchange failed.", detail: data }, upstream.status);
  }

  const parsed = (data && typeof data === "object" ? (data as any) : {}) as {
    message?: ExchangeTokenResponse;
  };
  const message = (parsed.message && typeof parsed.message === "object" ? parsed.message : parsed) as ExchangeTokenResponse;

  if (message.status !== "success") {
    return withCookies({ error: "Google login failed.", detail: data }, 401);
  }

  return withCookies(
    {
      success: true,
      message: message.message,
      user: {
        full_name: message.full_name,
        home_page: message.home_page,
        candidate_id: message.profile,
        email: message.user ?? message.email,
      },
    },
    200
  );
}

