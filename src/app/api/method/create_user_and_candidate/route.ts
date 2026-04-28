import { NextResponse } from "next/server";
import { DUPLICATE_EMAIL_MESSAGE } from "@/services/signup/constants";

/** Mock “DB” when `BACKEND_URL` is unset — same email twice returns 409 (resets on server restart). */
const mockRegisteredEmails = new Set<string>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function stripHtml(input: string) {
  // Keep it simple: we only need to remove backend HTML wrapper tags.
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

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


export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const first_name = typeof body.first_name === "string" ? body.first_name : "";
  const last_name = typeof body.last_name === "string" ? body.last_name : "";
  const nameFromBody = typeof body.name === "string" ? body.name : "";
  const password = typeof body.password === "string" ? body.password : "";

  // Frappe backend expects `name`. Some older clients may not send it explicitly,
  // so derive it from first/last name when missing.
  const name = (nameFromBody || `${first_name} ${last_name}`).trim();

  if (!email || !first_name || !last_name || !name || !password) {
    return NextResponse.json(
      { error: "email, first_name, last_name, name, and password are required." },
      { status: 400 }
    );
  }

  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");

  if (backendBase) {
    const url = `${backendBase}/api/method/create_user_and_candidate`;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    const auth = process.env.BACKEND_AUTHORIZATION;
    if (auth) headers.Authorization = auth;

    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        first_name,
        last_name,
        name,
        password,
      }),
    });
    const upstreamSetCookies: string[] = (() => {
      const anyHeaders = upstream.headers as any;
      if (typeof anyHeaders.getSetCookie === "function") {
        return anyHeaders.getSetCookie() as string[];
      }
      const single = upstream.headers.get("set-cookie");
      return single ? [single] : [];
    })();

    const text = await upstream.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { raw: text };
    }

    const withUpstreamUrl = (payload: unknown, status: number) => {
      const res = NextResponse.json(payload, { status });
      for (const cookie of upstreamSetCookies) {
        res.headers.append("set-cookie", normalizeCookieForThisApp(cookie));
      }
      res.headers.set("x-upstream-url", url);
      return res;
    };

    // Some backends (e.g. Frappe) may return HTTP 200 while indicating an error inside JSON.
    const maybeMessage = (data as { message?: unknown }).message;
    const maybeStatus =
      maybeMessage && typeof maybeMessage === "object"
        ? (maybeMessage as { status?: unknown }).status
        : undefined;
    if (maybeMessage && typeof maybeMessage === "object" && typeof maybeStatus === "string" && maybeStatus.toLowerCase() === "error") {
      const msgObj = maybeMessage as { message?: unknown; title?: unknown };
      const msg =
        typeof msgObj.message === "string"
          ? msgObj.message
          : typeof msgObj.title === "string"
            ? msgObj.title
            : text;

      const cleanedMsg = stripHtml(msg);
      const lower = msg.toLowerCase();
      const looksDuplicate =
        lower.includes("duplicate") ||
        lower.includes("already exists") ||
        lower.includes("already registered");

      return withUpstreamUrl(
        looksDuplicate
          ? { error: DUPLICATE_EMAIL_MESSAGE, detail: data }
          : { error: cleanedMsg || "Request failed", detail: data },
        looksDuplicate ? 409 : 400
      );
    }

    // Pass through duplicate / conflict responses from the real backend
    if (!upstream.ok) {
      const errMsg =
        typeof data.error === "string"
          ? data.error
          : typeof data.message === "string"
            ? data.message
            : typeof data.exc === "string"
              ? data.exc
              : text;
      const lower = errMsg.toLowerCase();
      const looksDuplicate =
        upstream.status === 409 ||
        upstream.status === 422 ||
        lower.includes("duplicate") ||
        lower.includes("already exists") ||
        lower.includes("already registered");

      return withUpstreamUrl(
        looksDuplicate
          ? { error: DUPLICATE_EMAIL_MESSAGE, detail: data }
          : { error: errMsg || `Upstream error (${upstream.status})`, detail: data },
        looksDuplicate ? 409 : upstream.status
      );
    }

    return withUpstreamUrl(data as object, upstream.status);
  }

  const key = normalizeEmail(email);
  if (mockRegisteredEmails.has(key)) {
    return NextResponse.json({ error: DUPLICATE_EMAIL_MESSAGE }, { status: 409 });
  }

  mockRegisteredEmails.add(key);

  return NextResponse.json(
    {
      message: "ok",
      message_detail:
        "BACKEND_URL not set — mock registration stored in memory only. Sign up again with the same email to test duplicate validation.",
      data: { email, first_name, last_name, name },
    },
    { status: 200 }
  );
}
