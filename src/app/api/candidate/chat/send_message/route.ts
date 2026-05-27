import { frappePost } from "@/lib/api";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const incomingCookies = req.headers.get("cookie");
    const jsonData = await req.json();
    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (incomingCookies) forwardHeaders["Cookie"] = incomingCookies;

    const {
      data,
      headers: responseHeaders,
      status,
    } = await frappePost(
      `/api/method/send_chat_message_screened`,
      { ...jsonData },
      { headers: forwardHeaders }
    );

    const res = NextResponse.json(data, { status });
    const setCookieArr: string[] = [];
    const singleCookie = responseHeaders.get("set-cookie");
    if (singleCookie) {
      setCookieArr.push(...singleCookie.split(/,(?=\s*[^=]+=)/));
    }

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
