import { NextResponse } from "next/server";

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

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

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
  return res;
}

