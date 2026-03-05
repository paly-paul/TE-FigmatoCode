import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { EnvelopeCheckIllustration } from "@/components/icons";

export default function ConfirmationPage() {
  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center py-4">
        {/* Illustration */}
        <div className="mb-6">
          <EnvelopeCheckIllustration />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Confirmation Link Sent!
        </h1>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-8">
          A secure magic link has been sent to your registered email address to
          confirm your account.
        </p>

        {/* CTA */}
        <Button type="button" className="mb-5">
          Okay!
        </Button>

        {/* Resend */}
        <p className="text-sm text-gray-500">
          Didn&apos;t receive the link?{" "}
          <Link
            href="#"
            className="font-semibold text-primary-600 hover:text-primary-700"
          >
            Resend
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
