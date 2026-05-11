import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DesktopSuccessStoriesPanel } from "@/components/desktop/DesktopSuccessStoriesPanel";
import { Button } from "@/components/ui/Button";
import { ProfileCheckIllustration } from "@/components/icons";

type PasswordUpdatedPageProps = {
  searchParams?: {
    email?: string;
  };
};

export default function PasswordUpdatedPage({ searchParams }: PasswordUpdatedPageProps) {
  const resetEmail = typeof searchParams?.email === "string" ? searchParams.email.trim().toLowerCase() : "";
  const loginHref = resetEmail ? `/login?email=${encodeURIComponent(resetEmail)}` : "/login";

  return (
    <AuthLayout rightPanel={<DesktopSuccessStoriesPanel />}>
      <div className="flex flex-col items-center text-center py-4">
        {/* Illustration */}
        <div className="mb-6">
          <ProfileCheckIllustration />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Password Updated Successfully!
        </h1>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-8">
          Your password has been successfully reset. You can now sign in to your
          SixFE account.
        </p>

        {/* CTA */}
        <Link href={loginHref} className="w-full">
          <Button type="button">Back to Login</Button>
        </Link>
      </div>
    </AuthLayout>
  );
}
