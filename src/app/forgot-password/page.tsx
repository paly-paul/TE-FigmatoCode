"use client";

import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: connect to auth API
    console.log({ email });
    window.location.href = "/signup/confirmation";
  }

  return (
    <AuthLayout
      showFooter
      footerText="Remember your password?"
      footerLinkLabel="Login"
      footerLinkHref="/login"
    >
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Forgot Password?
        </h1>
        <p className="text-sm text-gray-500">
          Enter your email and we&apos;ll send you a reset link
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

        <Button type="submit" className="mt-1">
          Send Reset Link
        </Button>
      </form>
    </AuthLayout>
  );
}
