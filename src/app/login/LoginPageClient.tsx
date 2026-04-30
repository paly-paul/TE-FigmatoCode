"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DesktopSuccessStoriesPanel } from "@/components/desktop/DesktopSuccessStoriesPanel";
import { MobileLoginScreen } from "@/components/mobile/MobileLoginScreen";
import {
  SocialLoginDivider,
  SocialLoginButtons,
} from "@/components/auth/SocialButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { setDashboardWelcomePending } from "@/lib/dashboardWelcome";
import { getPostLoginDestination } from "@/services/login/postLoginRouting";
import { MOBILE_MQ } from "@/lib/mobileViewport";
import { useCandidateLogin } from "@/services/login";
import { prefetchDropdownDetailsAfterLogin } from "@/services/jobs/dropdownDetails";

export default function LoginPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const { submit, isLoading, error } = useCandidateLogin();
  const [isRedirecting, setIsRedirecting] = useState(false);
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
    if (isLoading || isRedirecting) return;
    const ok = await submit({ email, password });
    if (!ok) return;
    setIsRedirecting(true);
    prefetchDropdownDetailsAfterLogin();

    const destination = await getPostLoginDestination(email);
    const skipWizard = destination === "/dashboard";
    console.log("[login-page] final-decision", {
      email: email.trim().toLowerCase(),
      skipWizard,
      destination,
    });
    if (skipWizard) {
      setDashboardWelcomePending();
    }
    router.replace(destination);
  }

  if (isMobileViewport) {
    return <MobileLoginScreen />;
  }

  return (
    <AuthLayout
      showFooter
      footerText="Don't have an account?"
      footerLinkLabel="Sign Up"
      footerLinkHref="/signup"
      rightPanel={<DesktopSuccessStoriesPanel />}
    >
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

        <div className="flex items-center justify-between">
          <Checkbox
            label="Remember Me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <Link
            href="/forgot-password/"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Forgot Password?
          </Link>
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="mt-1" disabled={isLoading || isRedirecting}>
          {isLoading ? "Signing in..." : isRedirecting ? "Redirecting..." : "Continue"}
        </Button>
      </form>

      <SocialLoginDivider />
      <SocialLoginButtons />
    </AuthLayout>
  );
}
