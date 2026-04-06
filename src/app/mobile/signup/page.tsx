"use client";

import { MobileSignupDesktopRedirect } from "@/components/mobile/mobileAuthRedirects";
import { MobileSignupScreen } from "@/components/mobile/MobileSignupScreen";

export default function MobileSignupPage() {
  return (
    <>
      <MobileSignupDesktopRedirect />
      <MobileSignupScreen />
    </>
  );
}
