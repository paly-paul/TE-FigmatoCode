"use client";

import { MobileForgotPasswordDesktopRedirect } from "@/components/mobile/mobileAuthRedirects";
import { MobileForgotPasswordScreen } from "@/components/mobile/MobileForgotPasswordScreen";

export default function MobileForgotPasswordPage() {
  return (
    <>
      <MobileForgotPasswordDesktopRedirect />
      <MobileForgotPasswordScreen />
    </>
  );
}
