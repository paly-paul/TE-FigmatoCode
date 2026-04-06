"use client";

import Link from "next/link";
import { MobileAuthHeader } from "@/components/mobile/MobileAuthHeader";
import { MobileSuccessStoriesSection } from "@/components/mobile/MobileSuccessStories";
import { Button } from "@/components/ui/Button";
import { EnvelopeCheckIllustration } from "@/components/icons";

export function MobileResetPasswordSentScreen() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white">
      <MobileAuthHeader />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-6 pt-6">
        <div className="flex flex-1 flex-col items-center text-center">
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
            <Button type="button" className="min-h-[48px] text-base">
              Okay!
            </Button>
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
      </main>

      <MobileSuccessStoriesSection heading="Simple to use with relevant job listings" />
    </div>
  );
}
