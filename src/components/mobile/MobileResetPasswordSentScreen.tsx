"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileAuthHeader } from "@/components/mobile/MobileAuthHeader";
import { MobileSuccessStoriesSection } from "@/components/mobile/MobileSuccessStories";
import { Button } from "@/components/ui/Button";
import { EnvelopeCheckIllustration } from "@/components/icons";
import { sendCandidateSignupOtp, verifyCandidateSignupOtp } from "@/services/signup";

type MobileResetPasswordSentScreenProps = {
  email?: string;
};

export function MobileResetPasswordSentScreen({ email = "" }: MobileResetPasswordSentScreenProps) {
  const OTP_LENGTH = 5;
  const router = useRouter();
  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const normalizedEmail = email.trim().toLowerCase();
  const otpValue = otpDigits.join("");
  const maskedEmail = useMemo(() => {
    if (!normalizedEmail || !normalizedEmail.includes("@")) return "";
    const [local, domain] = normalizedEmail.split("@");
    if (!local) return normalizedEmail;
    const first = local.charAt(0);
    const last = local.length > 1 ? local.charAt(local.length - 1) : "";
    return `${first}${"*".repeat(Math.max(1, local.length - 2))}${last}@${domain}`;
  }, [normalizedEmail]);

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
    if (!normalizedEmail) {
      setError("Missing email. Please start from forgot password.");
      return;
    }
    if (otpValue.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit OTP.`);
      return;
    }
    setIsSubmittingOtp(true);
    try {
      await verifyCandidateSignupOtp(normalizedEmail, otpValue);
      router.push(`/new-password/?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify OTP.");
    } finally {
      setIsSubmittingOtp(false);
    }
  }

  async function handleResendOtp() {
    setError(null);
    setInfo(null);
    if (!normalizedEmail) {
      setError("Missing email. Please start from forgot password.");
      return;
    }
    setIsResendingOtp(true);
    try {
      const otpResponse = await sendCandidateSignupOtp(normalizedEmail, { allowExistingUser: true });
      setInfo(otpResponse.message || "A new OTP has been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend OTP.");
    } finally {
      setIsResendingOtp(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white">
      <MobileAuthHeader />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-6 pt-6">
        <div className="flex flex-1 flex-col items-center text-center">
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

            <Button type="submit" className="mb-4 min-h-[48px] text-base" disabled={isSubmittingOtp}>
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
            <Link
              href="/forgot-password/"
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              Edit email
            </Link>
          </p>
        </div>
      </main>

      <MobileSuccessStoriesSection heading="Simple to use with relevant job listings" />
    </div>
  );
}
