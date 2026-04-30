import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Cannot download profile resume." },
      { status: 503 }
    );
  }

  const reqUrl = new URL(request.url);
  const key = reqUrl.searchParams.get("key")?.trim() ?? "";
  const fileName = reqUrl.searchParams.get("file_name")?.trim() ?? "profile_resume.pdf";
  if (!key) {
    return NextResponse.json({ error: "key is required." }, { status: 400 });
  }

  const upstreamParams = new URLSearchParams();
  upstreamParams.set("key", key);
  upstreamParams.set("file_name", fileName);
  const upstreamUrl = `${backendBase}/api/method/frappe_s3_attachment.controller.generate_file?${upstreamParams.toString()}`;

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(upstreamUrl, {
    method: "GET",
    headers,
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text || "Unable to download profile resume.", {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "text/plain; charset=utf-8" },
    });
  }

  const responseHeaders = new Headers();
  responseHeaders.set(
    "Content-Type",
    upstream.headers.get("content-type") || "application/pdf"
  );
  responseHeaders.set(
    "Content-Disposition",
    upstream.headers.get("content-disposition") || `attachment; filename="${fileName}"`
  );
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);
  responseHeaders.set("Cache-Control", "no-store");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
