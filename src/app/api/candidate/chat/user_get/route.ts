import { frappeGet } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const incomingCookies = req.headers.get("cookie");

    const { searchParams } = new URL(req.url);
    const profile_name = searchParams.get("profile_name");

    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (incomingCookies) {
      forwardHeaders["Cookie"] = incomingCookies;
    }
    const {
      data,
      headers: responseHeaders,
      status,
    } = await frappeGet(
      `/api/method/get_shortlisted_rr?profile_name=${profile_name ?? ""}`,
      {
        headers: forwardHeaders,
      }
    );
    const res = NextResponse.json(data, { status });

    const setCookieArr: string[] = [];
    if (setCookieArr.length === 0) {
      const single = responseHeaders.get("set-cookie");
      if (single) setCookieArr.push(...single.split(/,(?=\s*[^=]+=)/));
    }

    const isProd = process.env.NEXT_ENV === "production";
    setCookieArr.forEach((raw) => {
      let cookie = raw.trim();
      cookie = cookie.replace(/;\s*Domain=[^;]+/i, "");
      if (!/;\s*Path=/i.test(cookie)) cookie += "; Path=/";
      if (!/;\s*SameSite=/i.test(cookie)) {
        if (isProd) cookie += "; SameSite=None; Secure";
        else cookie += "; SameSite=Lax";
      }
      res.headers.append("Set-Cookie", cookie);
    });
    return res;
  } catch (error: unknown) {
    let message = "Unknown error";

    if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      { message: "Internal Server Error", error: message },
      { status: 500 }
    );
  }
}
