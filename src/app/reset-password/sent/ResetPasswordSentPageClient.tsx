"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DesktopSuccessStoriesPanel } from "@/components/desktop/DesktopSuccessStoriesPanel";
import { MobileResetPasswordSentScreen } from "@/components/mobile/MobileResetPasswordSentScreen";
import { Button } from "@/components/ui/Button";
import { EnvelopeCheckIllustration } from "@/components/icons";
import { getViewportIsMobile, MOBILE_MQ } from "@/lib/mobileViewport";

export default function ResetPasswordSentPageClient() {
  const [isMobileViewport, setIsMobileViewport] = useState(getViewportIsMobile);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (isMobileViewport) {
    return <MobileResetPasswordSentScreen />;
  }

  return (
    <AuthLayout
      leftPanelGrid
      rightPanel={<DesktopSuccessStoriesPanel />}
    >
      <div className="flex flex-col items-center py-4 text-center">
        <div className="mb-6">
          <EnvelopeCheckIllustration />
        </div>

        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Password Reset Link Sent!
        </h1>
        <p className="mb-8 max-w-xs text-sm leading-relaxed text-gray-500">
          A secure magic link has been sent to your registered email address to
          reset your password.
        </p>

        <Link href="/new-password/" className="w-full">
          <Button type="button">Okay!</Button>
        </Link>

        <p className="mt-5 text-sm text-gray-500">
          Didn&apos;t receive the link?{" "}
          <Link
            href="/forgot-password/"
            className="font-semibold text-primary-600 hover:text-primary-700"
          >
            Resend
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
