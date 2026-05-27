export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "";

interface FrappeResponse {
  data: unknown;
  headers: Headers;
  status: number;
}

async function frappeGet(
  path: string,
  options?: { headers?: Record<string, string> }
): Promise<FrappeResponse> {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) throw new Error("BACKEND_URL is not set.");

  const res = await fetch(`${backendBase}${path}`, {
    method: "GET",
    headers: options?.headers,
  });
  const data = await res.json();
  return { data, headers: res.headers, status: res.status };
}

async function frappePost(
  path: string,
  body: Record<string, unknown>,
  options?: { headers?: Record<string, string> }
): Promise<FrappeResponse> {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) throw new Error("BACKEND_URL is not set.");

  const res = await fetch(`${backendBase}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { data, headers: res.headers, status: res.status };
}

export { frappeGet, frappePost };
