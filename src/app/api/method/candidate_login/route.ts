import { NextResponse } from "next/server";
import { hasFrappeLogicalError } from "@/lib/frappeLogicalError";
import { loginUserFacingErrorMessage } from "@/services/login/loginUserFacingError";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const emailRaw = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const email = emailRaw.trim().toLowerCase();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");

  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Cannot login in local mock mode." },
      { status: 503 }
    );
  }

  // Use the documented candidate login endpoint so we receive
  // candidate-specific metadata such as the linked Profile document ID.
  const url = `${backendBase}/api/method/candidate_login`;
  const headers: HeadersInit = { "Content-Type": "application/json" };

  const upstream = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      usr: email,
      pwd: password,
    }),
  });

  // Pass through cookies (Frappe/ERPNext login often relies on session cookies).
  // Node fetch may expose `getSetCookie()`; if not, we fall back to `set-cookie`.
  const upstreamSetCookies: string[] = (() => {
    const anyHeaders = upstream.headers as any;
    if (typeof anyHeaders.getSetCookie === "function") {
      return anyHeaders.getSetCookie() as string[];
    }
    const single = upstream.headers.get("set-cookie");
    return single ? [single] : [];
  })();

  function normalizeCookieForThisApp(cookie: string) {
    // The upstream backend sets cookies for its own domain; when proxying,
    // we want them stored for the current Next.js app host.
    // Remove Domain attribute so the browser defaults to the response host.
    let next = cookie.replace(/;\s*Domain=[^;]+/i, "");
    // Ensure path is set.
    next = next.replace(/;\s*Path=[^;]+/i, "; Path=/");
    if (!/;\s*Path=/i.test(next)) next = `${next}; Path=/`;

    // In local dev we often run over HTTP, but some backends mark cookies as `Secure`,
    // which prevents the browser from storing them. For dev only, drop `Secure`.
    if (process.env.NODE_ENV !== "production") {
      next = next.replace(/;\s*Secure\b/i, "");
    }
    return next;
  }

  const withCookies = (payload: unknown, status: number) => {
    const res = NextResponse.json(payload, { status });
    for (const cookie of upstreamSetCookies) {
      res.headers.append("set-cookie", normalizeCookieForThisApp(cookie));
    }
    res.headers.set("x-upstream-url", url);
    return res;
  };

  const text = await upstream.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { raw: text };
  }

  const looksError = !upstream.ok || hasFrappeLogicalError(data);

  if (looksError) {
    const msg = loginUserFacingErrorMessage(data);
    return withCookies({ error: msg, detail: data }, 401);
  }

  return withCookies(data as object, upstream.status);
}
