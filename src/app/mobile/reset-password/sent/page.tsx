"use client";

import { MobileResetPasswordSentDesktopRedirect } from "@/components/mobile/mobileAuthRedirects";
import { MobileResetPasswordSentScreen } from "@/components/mobile/MobileResetPasswordSentScreen";

export default function MobileResetPasswordSentPage() {
  return (
    <>
      <MobileResetPasswordSentDesktopRedirect />
      <MobileResetPasswordSentScreen />
    </>
  );
}
