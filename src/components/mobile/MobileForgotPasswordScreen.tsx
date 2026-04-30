"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileAuthHeader } from "@/components/mobile/MobileAuthHeader";
import { MobileSuccessStoriesSection } from "@/components/mobile/MobileSuccessStories";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { sendCandidateSignupOtp } from "@/services/signup";

export function MobileForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setIsSubmitting(true);
    try {
      await sendCandidateSignupOtp(normalizedEmail, { allowExistingUser: true });
      router.push(`/reset-password/sent/?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send OTP.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white">
      <MobileAuthHeader />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-6 pt-6">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-gray-900">Forgot Password?</h1>
          <p className="text-sm text-gray-500">
            Enter your email and we&apos;ll send you a one-time password (OTP)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="Enter email ID here..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="mt-1 min-h-[48px] text-base" disabled={isSubmitting}>
            {isSubmitting ? "Sending OTP..." : "Send OTP"}
          </Button>
        </form>
      </main>

      <div className="mt-auto border-t border-gray-100 bg-gray-50 px-4 py-4 text-center text-sm text-gray-500">
        Remember your password?{" "}
        <Link
          href="/login/"
          className="font-semibold text-primary-600 hover:text-primary-700"
        >
          Login
        </Link>
      </div>

      <MobileSuccessStoriesSection heading="Simple to use with relevant job listings" />
    </div>
  );
}
