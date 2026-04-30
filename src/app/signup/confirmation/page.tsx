"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { EnvelopeCheckIllustration } from "@/components/icons";
import { setDashboardWelcomePending } from "@/lib/dashboardWelcome";
import { shouldSkipProfileWizardAfterLogin } from "@/services/login/postLoginRouting";
import { prefetchDropdownDetailsAfterLogin } from "@/services/jobs/dropdownDetails";
import {
  completeSignupFromPending,
  getPendingSignupForm,
  sendCandidateSignupOtp,
  verifyCandidateSignupOtp,
} from "@/services/signup";

export default function ConfirmationPage() {
  const OTP_LENGTH = 5;
  const router = useRouter();
  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const pending = getPendingSignupForm();
    if (!pending) {
      router.replace("/signup");
      return;
    }
    setEmail(pending.email.trim().toLowerCase());
  }, [router]);

  const otpValue = otpDigits.join("");
  const maskedEmail = useMemo(() => {
    if (!email || !email.includes("@")) return "";
    const [local, domain] = email.split("@");
    if (!local) return email;
    const first = local.charAt(0);
    const last = local.length > 1 ? local.charAt(local.length - 1) : "";
    return `${first}${"*".repeat(Math.max(1, local.length - 2))}${last}@${domain}`;
  }, [email]);

  function updateDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    setError(null);
    setSuccess(null);
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
    setSuccess(null);
    if (!email) {
      setError("Signup session expired. Please create your account again.");
      router.replace("/signup");
      return;
    }
    if (otpValue.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit OTP.`);
      return;
    }

    setIsSubmittingOtp(true);
    try {
      await verifyCandidateSignupOtp(email, otpValue);
      await completeSignupFromPending();
      prefetchDropdownDetailsAfterLogin();

      const skipWizard = await shouldSkipProfileWizardAfterLogin(email);
      if (skipWizard) {
        setDashboardWelcomePending({ force: true });
        router.replace("/dashboard");
      } else {
        router.replace("/profile/create");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify OTP.");
    } finally {
      setIsSubmittingOtp(false);
    }
  }

  async function handleResendOtp() {
    setError(null);
    setSuccess(null);
    if (!email) {
      setError("Signup session expired. Please create your account again.");
      router.replace("/signup");
      return;
    }

    setIsResendingOtp(true);
    try {
      const otpResponse = await sendCandidateSignupOtp(email);
      setSuccess(otpResponse.message || "OTP resent to your registered email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend OTP.");
    } finally {
      setIsResendingOtp(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center py-4">
        <div className="mb-6">
          <EnvelopeCheckIllustration />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Verify Your Account</h1>
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-2">
          We&apos;ve sent a one-time password (OTP) to your registered email. Please
          enter it below to complete your verification.
        </p>
        {maskedEmail ? <p className="text-sm text-gray-600 mb-6">{maskedEmail}</p> : null}

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
          {success ? <p className="mb-3 text-sm text-green-600">{success}</p> : null}

          <Button type="submit" disabled={isSubmittingOtp} className="mb-5">
            {isSubmittingOtp ? "Verifying..." : "Submit OTP"}
          </Button>
        </form>

        <p className="text-sm text-gray-500">
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
      </div>
    </AuthLayout>
  );
}
