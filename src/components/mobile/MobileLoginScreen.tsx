"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileAuthHeader } from "@/components/mobile/MobileAuthHeader";
import { MobileSuccessStoriesSection } from "@/components/mobile/MobileSuccessStories";
import {
  SocialLoginDivider,
  SocialLoginButtons,
} from "@/components/auth/SocialButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { setDashboardWelcomePending } from "@/lib/dashboardWelcome";
import { getPostLoginDestination } from "@/services/login/postLoginRouting";
import { useCandidateLogin } from "@/services/login";
import { prefetchDropdownDetailsAfterLogin } from "@/services/jobs/dropdownDetails";

export function MobileLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const { submit, isLoading, error } = useCandidateLogin();
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading || isRedirecting) return;
    const ok = await submit({ email, password });
    if (!ok) return;
    setIsRedirecting(true);
    prefetchDropdownDetailsAfterLogin();

    const destination = await getPostLoginDestination(email);
    const skipWizard = destination === "/dashboard";
    console.log("[mobile-login-page] final-decision", {
      email: email.trim().toLowerCase(),
      skipWizard,
      destination,
    });
    if (skipWizard) {
      setDashboardWelcomePending();
    }
    router.replace(destination);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white">
      <MobileAuthHeader />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-6 pt-6">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-gray-900">
            Welcome to SixFE
          </h1>
          <p className="text-sm text-gray-500">
            Continue with your Email ID &amp; Password
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

          <Input
            label="Password"
            isPassword
            placeholder="Enter password here..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <div className="flex items-center justify-between gap-3">
            <Checkbox
              label="Remember Me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <Link
              href="/forgot-password/"
              className="shrink-0 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Forgot Password?
            </Link>
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="mt-1 min-h-[48px] text-base"
            disabled={isLoading || isRedirecting}
          >
            {isLoading ? "Signing in..." : isRedirecting ? "Redirecting..." : "Continue"}
          </Button>
        </form>

        <div className="[&_button]:min-h-[48px]">
          <SocialLoginDivider />
          <SocialLoginButtons />
        </div>
      </main>

      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary-600 hover:text-primary-700"
        >
          Sign Up
        </Link>
      </div>

      <MobileSuccessStoriesSection heading="Simple to use with relevant job listings" />
    </div>
  );
}
