"use client";

import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DesktopSuccessStoriesPanel } from "@/components/desktop/DesktopSuccessStoriesPanel";
import { MobileSignupScreen } from "@/components/mobile/MobileSignupScreen";
import {
  SocialLoginDivider,
  SocialLoginButtons,
} from "@/components/auth/SocialButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MOBILE_MQ } from "@/lib/mobileViewport";
import { useSignupSubmit } from "@/services/signup";

export default function SignupPageClient() {
  const { submit, isLoading, error } = useSignupSubmit();
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit(form);
  }

  if (isMobileViewport) {
    return <MobileSignupScreen />;
  }

  return (
    <AuthLayout
      showFooter
      footerText="Already have an account?"
      footerLinkLabel="Login"
      footerLinkHref="/login"
      rightPanel={<DesktopSuccessStoriesPanel />}
    >
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Create An Account</h1>
        <p className="text-sm text-gray-500">
          Continue with your Email ID, Name &amp; Password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="Enter email ID here..."
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            type="text"
            name="firstName"
            placeholder="Enter first name here..."
            value={form.firstName}
            onChange={handleChange}
            autoComplete="given-name"
            required
          />
          <Input
            label="Last Name"
            type="text"
            name="lastName"
            placeholder="Enter last name here..."
            value={form.lastName}
            onChange={handleChange}
            autoComplete="family-name"
            required
          />
        </div>

        <Input
          label="Password"
          name="password"
          isPassword
          showInfoIcon
          placeholder="Enter password here..."
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="mt-1" disabled={isLoading}>
          {isLoading ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <SocialLoginDivider />
      <SocialLoginButtons />
    </AuthLayout>
  );
}
