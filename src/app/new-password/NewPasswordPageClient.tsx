"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DesktopSuccessStoriesPanel } from "@/components/desktop/DesktopSuccessStoriesPanel";
import { MobileNewPasswordScreen } from "@/components/mobile/MobileNewPasswordScreen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MOBILE_MQ } from "@/lib/mobileViewport";
import { resetUserPassword } from "@/services/resetPassword";

export default function NewPasswordPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      const encodedEmail = encodeURIComponent(email);
      router.replace(`/password-updated/?email=${encodedEmail}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isMobileViewport) {
    return <MobileNewPasswordScreen />;
  }

  return (
    <AuthLayout
      leftPanelGrid
      rightPanel={<DesktopSuccessStoriesPanel />}
    >
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

        <Button type="submit" className="mt-1" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update"}
        </Button>
      </form>
    </AuthLayout>
  );
}
