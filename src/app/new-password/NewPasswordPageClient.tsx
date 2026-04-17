"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DesktopSuccessStoriesPanel } from "@/components/desktop/DesktopSuccessStoriesPanel";
import { MobileNewPasswordScreen } from "@/components/mobile/MobileNewPasswordScreen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MOBILE_MQ } from "@/lib/mobileViewport";

export default function NewPasswordPageClient() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    // TODO: connect to auth API
    console.log({ newPassword });
    router.push("/password-updated/");
  }

  if (isMobileViewport) {
    return <MobileNewPasswordScreen />;
  }

  return (
    <AuthLayout
      showFooter
      footerText="Don't have an account?"
      footerLinkLabel="Sign Up"
      footerLinkHref="/signup"
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

        <Button type="submit" className="mt-1">
          Update
        </Button>
      </form>
    </AuthLayout>
  );
}
