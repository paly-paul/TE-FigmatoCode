"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { MobileAuthHeader } from "@/components/mobile/MobileAuthHeader";
import { MobileSuccessStoriesSection } from "@/components/mobile/MobileSuccessStories";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { resetUserPassword } from "@/services/resetPassword";

export function MobileNewPasswordScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Missing email. Please start from forgot password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await resetUserPassword(email, newPassword);
      router.push("/password-updated/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white">
      <MobileAuthHeader />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-6 pt-6">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-gray-900">New Password</h1>
          <p className="text-sm text-gray-500">
            Create a new password for your SixFE account
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
            type="password"
            placeholder="Enter password here..."
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            error={error}
          />

          <Button type="submit" className="mt-1 min-h-[48px] text-base" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update"}
          </Button>
        </form>
      </main>

      <div className="mt-auto border-t border-gray-100 bg-gray-50 px-4 py-4 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup/"
          className="font-semibold text-primary-600 hover:text-primary-700"
        >
          Sign Up
        </Link>
      </div>

      <MobileSuccessStoriesSection heading="Simple to use with relevant job listings" />
    </div>
  );
}
