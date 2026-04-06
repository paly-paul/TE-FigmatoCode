"use client";

import { MobileDesktopRedirect } from "@/components/mobile/mobileAuthRedirects";
import { MobileLoginScreen } from "@/components/mobile/MobileLoginScreen";

export default function MobileLoginPage() {
  return (
    <>
      <MobileDesktopRedirect />
      <MobileLoginScreen />
    </>
  );
}
