"use client";

import { Suspense } from "react";
import { MobileNewPasswordDesktopRedirect } from "@/components/mobile/mobileAuthRedirects";
import { MobileNewPasswordScreen } from "@/components/mobile/MobileNewPasswordScreen";

export default function MobileNewPasswordPage() {
  return (
    <>
      <MobileNewPasswordDesktopRedirect />
      <Suspense>
        <MobileNewPasswordScreen />
      </Suspense>
    </>
  );
}
