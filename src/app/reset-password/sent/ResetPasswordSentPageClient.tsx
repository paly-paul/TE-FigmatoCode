"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DesktopSuccessStoriesPanel } from "@/components/desktop/DesktopSuccessStoriesPanel";
import { MobileResetPasswordSentScreen } from "@/components/mobile/MobileResetPasswordSentScreen";
import { Button } from "@/components/ui/Button";
import { EnvelopeCheckIllustration } from "@/components/icons";
import { MOBILE_MQ } from "@/lib/mobileViewport";
import { sendCandidateSignupOtp, verifyCandidateSignupOtp } from "@/services/signup";

export default function ResetPasswordSentPageClient() {
  const OTP_LENGTH = 5;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const otpValue = otpDigits.join("");
  const maskedEmail = useMemo(() => {
    if (!email || !email.includes("@")) return "";
    const [local, domain] = email.split("@");
    if (!local) return email;
    const first = local.charAt(0);
    const last = local.length > 1 ? local.charAt(local.length - 1) : "";
    return `${first}${"*".repeat(Math.max(1, local.length - 2))}${last}@${domain}`;
  }, [email]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function updateDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    setError(null);
    setInfo(null);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
    if (digits.length === 0) return;
    setOtpDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < OTP_LENGTH; i += 1) next[i] = digits[i] ?? "";
      return next;
    });
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleSubmitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Missing email. Please start from forgot password.");
      return;
    }
    if (otpValue.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit OTP.`);
      return;
    }
    setIsSubmittingOtp(true);
    try {
      await verifyCandidateSignupOtp(email, otpValue);
      router.push(`/new-password/?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify OTP.");
    } finally {
      setIsSubmittingOtp(false);
    }
  }

  async function handleResendOtp() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Missing email. Please start from forgot password.");
      return;
    }
    setIsResendingOtp(true);
    try {
      const otpResponse = await sendCandidateSignupOtp(email, { allowExistingUser: true });
      setInfo(otpResponse.message || "A new OTP has been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend OTP.");
    } finally {
      setIsResendingOtp(false);
    }
  }

  if (isMobileViewport) {
    return <MobileResetPasswordSentScreen email={email} />;
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

        <h1 className="mb-3 text-2xl font-bold text-gray-900">Enter OTP</h1>
        <p className="mb-2 max-w-xs text-sm leading-relaxed text-gray-500">
          We&apos;ve sent a one-time password (OTP) to your email. Enter it below to continue.
        </p>
        {maskedEmail ? <p className="mb-6 text-sm text-gray-600">{maskedEmail}</p> : null}

        <form onSubmit={handleSubmitOtp} className="w-full">
          <div className="mb-5 flex justify-center gap-2">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => updateDigit(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="h-12 w-10 rounded-lg border border-gray-300 text-center text-lg font-semibold text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                aria-label={`OTP digit ${index + 1}`}
              />
            ))}
          </div>

          {error ? (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {info ? <p className="mb-3 text-sm text-green-600">{info}</p> : null}

          <Button type="submit" className="mb-5" disabled={isSubmittingOtp}>
            {isSubmittingOtp ? "Verifying..." : "Verify OTP"}
          </Button>
        </form>

        <p className="mt-1 text-sm text-gray-500">
          Didn&apos;t receive the OTP?{" "}
          <button
            type="button"
            onClick={() => void handleResendOtp()}
            disabled={isResendingOtp}
            className="font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-60"
          >
            {isResendingOtp ? "Resending..." : "Resend"}
          </button>
        </p>

        <p className="mt-3 text-sm text-gray-500">
          Wrong email?{" "}
          <Link href="/forgot-password/" className="font-semibold text-primary-600 hover:text-primary-700">
            Edit email
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
