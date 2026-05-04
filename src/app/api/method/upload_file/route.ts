import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getCookieValue(cookieHeader: string | null, key: string) {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]).trim() : "";
}

export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Cannot upload file." },
      { status: 503 }
    );
  }

  const incoming = await request.formData();
  const file = incoming.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const target = new FormData();
  target.append("file", file, file.name);

  incoming.forEach((value, key) => {
    if (key === "file") return;
    if (typeof value === "string") target.append(key, value);
  });

  const cookie = request.headers.get("cookie");
  const sid = getCookieValue(cookie, "sid");
  const userId = getCookieValue(cookie, "user_id");
  const csrfToken = getCookieValue(cookie, "csrf_token");
  const headers: HeadersInit = {};
  // For user-scoped uploads, prefer the logged-in session cookie context.
  // Sending a static Authorization token together with cookies can make
  // Frappe evaluate the request under the wrong principal.
  if (cookie) {
    headers.Cookie = cookie;
    if (csrfToken) headers["X-Frappe-CSRF-Token"] = csrfToken;
  } else {
    const auth = process.env.BACKEND_AUTHORIZATION;
    if (auth) headers.Authorization = auth;
  }

  const url = `${backendBase}/api/method/upload_file`;
  const upstream = await fetch(url, {
    method: "POST",
    headers,
    body: target,
  });

  const text = await upstream.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { raw: text };
  }

  if (
    upstream.status === 403 &&
    typeof data.exc_type === "string" &&
    data.exc_type === "PermissionError"
  ) {
    data = {
      ...data,
      error:
        "Upload permission denied by backend. Login session may be missing/expired or this user lacks file upload permission.",
    };
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", url);
  res.headers.set("x-proxy-auth-mode", cookie ? "cookie" : headers.Authorization ? "authorization" : "none");
  // Temporary diagnostics for production auth debugging.
  res.headers.set("x-debug-has-cookie", cookie ? "1" : "0");
  res.headers.set("x-debug-has-sid", sid ? "1" : "0");
  res.headers.set("x-debug-has-user-id", userId ? "1" : "0");
  res.headers.set("x-debug-has-csrf", csrfToken ? "1" : "0");
  return res;
}

