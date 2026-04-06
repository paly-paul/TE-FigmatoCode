import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isMobileUserAgent } from "@/lib/mobileUserAgent";

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent");
  const mobile = isMobileUserAgent(ua);
  const path = normalizePath(request.nextUrl.pathname);

  if (path === "/login" && mobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/mobile/login/";
    return NextResponse.redirect(url);
  }

  if (path === "/mobile/login" && !mobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/login/";
    return NextResponse.redirect(url);
  }

  if (path === "/signup" && mobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/mobile/signup/";
    return NextResponse.redirect(url);
  }

  if (path === "/mobile/signup" && !mobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/signup/";
    return NextResponse.redirect(url);
  }

  if (path === "/forgot-password" && mobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/mobile/forgot-password/";
    return NextResponse.redirect(url);
  }

  if (path === "/mobile/forgot-password" && !mobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/forgot-password/";
    return NextResponse.redirect(url);
  }

  if (path === "/reset-password/sent" && mobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/mobile/reset-password/sent/";
    return NextResponse.redirect(url);
  }

  if (path === "/mobile/reset-password/sent" && !mobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/reset-password/sent/";
    return NextResponse.redirect(url);
  }

  if (path === "/new-password" && mobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/mobile/new-password/";
    return NextResponse.redirect(url);
  }

  if (path === "/mobile/new-password" && !mobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/new-password/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/login/",
    "/mobile/login",
    "/mobile/login/",
    "/signup",
    "/signup/",
    "/mobile/signup",
    "/mobile/signup/",
    "/forgot-password",
    "/forgot-password/",
    "/mobile/forgot-password",
    "/mobile/forgot-password/",
    "/reset-password/sent",
    "/reset-password/sent/",
    "/mobile/reset-password/sent",
    "/mobile/reset-password/sent/",
    "/new-password",
    "/new-password/",
    "/mobile/new-password",
    "/mobile/new-password/",
  ],
};
