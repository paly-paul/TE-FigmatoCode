import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json({ error: "BACKEND_URL is not set." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const rrcandidate = searchParams.get("rrcandidate")?.trim();
  const proposalName = searchParams.get("proposal_name")?.trim();

  if (!rrcandidate && !proposalName) {
    return NextResponse.json(
      { error: "Either rrcandidate or proposal_name is required." },
      { status: 400 }
    );
  }

  const qs = new URLSearchParams();
  if (rrcandidate) qs.set("rrcandidate", rrcandidate);
  if (proposalName) qs.set("proposal_name", proposalName);
  const url = `${backendBase}/api/method/get_proposal_data?${qs}`;

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const upstream = await fetch(url, { method: "GET", headers });
  const text = await upstream.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { raw: text };
  }

  const res = NextResponse.json(data, { status: upstream.status });
  res.headers.set("x-upstream-url", url);
  return res;
}

