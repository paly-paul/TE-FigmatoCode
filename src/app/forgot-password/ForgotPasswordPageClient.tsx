"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DesktopSuccessStoriesPanel } from "@/components/desktop/DesktopSuccessStoriesPanel";
import { MobileForgotPasswordScreen } from "@/components/mobile/MobileForgotPasswordScreen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MOBILE_MQ } from "@/lib/mobileViewport";
import { sendCandidateSignupOtp } from "@/services/signup";

export default function ForgotPasswordPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  if (isMobileViewport) {
    return <MobileForgotPasswordScreen />;
  }

  return (
    <AuthLayout
      showFooter
      footerText="Remember your password?"
      footerLinkLabel="Login"
      footerLinkHref="/login"
      rightPanel={<DesktopSuccessStoriesPanel />}
    >
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

        <Button type="submit" className="mt-1" disabled={isSubmitting}>
          {isSubmitting ? "Sending OTP..." : "Send OTP"}
        </Button>
      </form>
    </AuthLayout>
  );
}
