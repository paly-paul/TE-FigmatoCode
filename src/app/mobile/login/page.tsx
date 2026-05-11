"use client";

import { Suspense } from "react";
import { MobileDesktopRedirect } from "@/components/mobile/mobileAuthRedirects";
import { MobileLoginScreen } from "@/components/mobile/MobileLoginScreen";

export default function MobileLoginPage() {
  return (
    <>
      <MobileDesktopRedirect />
      <Suspense fallback={null}>
        <MobileLoginScreen />
      </Suspense>
    </>
  );
}
