"use client";

import { useState } from "react";
import Link from "next/link";
import { MobileAuthHeader } from "@/components/mobile/MobileAuthHeader";
import { MobileSuccessStoriesSection } from "@/components/mobile/MobileSuccessStories";
import {
  SocialLoginDivider,
  SocialLoginButtons,
} from "@/components/auth/SocialButtons";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { useSignupSubmit } from "@/services/signup";
import LegalHtmlModal from "@/components/legal/LegalHtmlModal";

export function MobileSignupScreen() {
  const { submit, isLoading, error } = useSignupSubmit();
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<null | { title: string; src: string }>(null);

  function openLegalModal(kind: "terms" | "privacy") {
    if (kind === "terms") {
      setLegalModal({
        title: "Terms & Conditions",
        src: "/legal/T%26C.html",
      });
      return;
    }

    setLegalModal({
      title: "Privacy Policy",
      src: "/legal/Privacy_Policy.html",
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreeToTerms) {
      setLocalError("Please agree to the Terms & Conditions to continue.");
      return;
    }
    setLocalError(null);
    void submit(form);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white">
      <MobileAuthHeader />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-6 pt-6">
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

          <Checkbox
            checked={agreeToTerms}
            onChange={(e) => {
              setAgreeToTerms(e.target.checked);
              if (e.target.checked) setLocalError(null);
            }}
            label={
              <span>
                I agree to{" "}
                <button
                  type="button"
                  className="font-semibold text-primary-600 hover:text-primary-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openLegalModal("terms");
                  }}
                >
                  Terms &amp; Conditions
                </button>
                <span className="mx-1">and</span>
                <button
                  type="button"
                  className="font-semibold text-primary-600 hover:text-primary-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openLegalModal("privacy");
                  }}
                >
                  Privacy &amp; Policy
                </button>
              </span>
            }
          />

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          {localError ? (
            <p className="text-sm text-red-600" role="alert">
              {localError}
            </p>
          ) : null}

          <Button type="submit" className="mt-1 min-h-[48px] text-base" disabled={isLoading}>
            {isLoading ? "Sending OTP..." : "Create Account"}
          </Button>
        </form>

        <div className="[&_button]:min-h-[48px]">
          <SocialLoginDivider />
          <SocialLoginButtons />
        </div>
      </main>

      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login/"
          className="font-semibold text-primary-600 hover:text-primary-700"
        >
          Login
        </Link>
      </div>

      <MobileSuccessStoriesSection heading="Simple to use with relevant job listings" />

      <LegalHtmlModal
        open={legalModal !== null}
        title={legalModal?.title ?? ""}
        src={legalModal?.src ?? ""}
        onNavigate={openLegalModal}
        onClose={() => setLegalModal(null)}
      />
    </div>
  );
}
