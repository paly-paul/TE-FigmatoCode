"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  SocialLoginDivider,
  SocialLoginButtons,
} from "@/components/auth/SocialButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { isProfileComplete } from "@/lib/profileOnboarding";
import { setDashboardWelcomePending } from "@/lib/dashboardWelcome";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: connect to auth API — use server "profile complete" when available
    if (isProfileComplete()) {
      setDashboardWelcomePending();
      router.push("/dashboard");
    } else {
      router.push("/profile/create");
    }
  }

  return (
    <AuthLayout
      showFooter
      footerText="Don't have an account?"
      footerLinkLabel="Sign Up"
      footerLinkHref="/signup"
    >
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Welcome to Talent Engine
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

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <Checkbox
            label="Remember Me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" className="mt-1">
          Continue
        </Button>
      </form>

      <SocialLoginDivider />
      <SocialLoginButtons />
    </AuthLayout>
  );
}
