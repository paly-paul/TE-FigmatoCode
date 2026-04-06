"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/useResponsive";

/** Sends wide viewports back to `/login/` from `/mobile/login/`. */
export function MobileDesktopRedirect() {
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) router.replace("/login/");
  }, [isMobile, router]);

  return null;
}

/** Sends wide viewports back to `/signup/` from `/mobile/signup/`. */
export function MobileSignupDesktopRedirect() {
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) router.replace("/signup/");
  }, [isMobile, router]);

  return null;
}

/** Sends wide viewports back to `/forgot-password/` from `/mobile/forgot-password/`. */
export function MobileForgotPasswordDesktopRedirect() {
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) router.replace("/forgot-password/");
  }, [isMobile, router]);

  return null;
}

/** Sends wide viewports back to `/reset-password/sent/` from `/mobile/reset-password/sent/`. */
export function MobileResetPasswordSentDesktopRedirect() {
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) router.replace("/reset-password/sent/");
  }, [isMobile, router]);

  return null;
}

/** Sends wide viewports back to `/new-password/` from `/mobile/new-password/`. */
export function MobileNewPasswordDesktopRedirect() {
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) router.replace("/new-password/");
  }, [isMobile, router]);

  return null;
}
