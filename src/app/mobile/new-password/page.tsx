"use client";

import { MobileNewPasswordDesktopRedirect } from "@/components/mobile/mobileAuthRedirects";
import { MobileNewPasswordScreen } from "@/components/mobile/MobileNewPasswordScreen";

export default function MobileNewPasswordPage() {
  return (
    <>
      <MobileNewPasswordDesktopRedirect />
      <MobileNewPasswordScreen />
    </>
  );
}
