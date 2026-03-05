"use client";

import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function NewPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    // TODO: connect to auth API
    console.log({ newPassword });
    window.location.href = "/password-updated";
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">New Password</h1>
        <p className="text-sm text-gray-500">
          Create a new password for your Talent Engine account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="New Password"
          isPassword
          showInfoIcon
          placeholder="Enter password here..."
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <Input
          label="Confirm Password"
          isPassword
          placeholder="Enter password here..."
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          error={error}
        />

        <Button type="submit" className="mt-1">
          Update
        </Button>
      </form>
    </AuthLayout>
  );
}
