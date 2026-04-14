import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { RightPanel } from "@/components/desktop/RightPanel";

interface AuthLayoutProps {
  children: ReactNode;
  footerText?: string;
  footerLinkLabel?: string;
  footerLinkHref?: string;
  showFooter?: boolean;
  /** Renders below the white card (e.g. success stories on reset-password sent). */
  belowCard?: ReactNode;
  /** When true, the decorative right panel is hidden (avoids duplicating success stories with `belowCard`). */
  hideRightPanel?: boolean;
  /** Replaces the default testimonial `RightPanel` (e.g. Swiper Success Stories on new password). */
  rightPanel?: ReactNode;
  /** Subtle grid pattern over the left column (matches desktop split-screen mocks). */
  leftPanelGrid?: boolean;
}

export function AuthLayout({
  children,
  footerText,
  footerLinkLabel,
  footerLinkHref,
  showFooter = false,
  belowCard,
  hideRightPanel = false,
  rightPanel,
  leftPanelGrid = false,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/*  Left Panel  */}
      <div
        className={`relative flex flex-col bg-[#F3F4F6] ${
          hideRightPanel ? "w-full" : "w-full lg:w-[45%]"
        }`}
      >
        {leftPanelGrid ? (
          <div
            className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.35]"
            aria-hidden
          />
        ) : null}

        <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-8 pt-7 pb-0">
            <Image
              src="/icons/logo.jpeg"
              width={35}
              height={35}
              alt="SixFE Logo"
            />
            <span className="font-semibold text-gray-800 text-base">SixFE</span>
          </div>

          {/* Card container — grows to fill remaining height */}
          <div
            className={`flex flex-1 flex-col px-6 py-10 ${
              belowCard ? "items-center justify-start gap-8 overflow-y-auto" : "items-center justify-center"
            }`}
          >
          {/* White card */}
          <div className="w-full max-w-[480px] shrink-0 bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Form content */}
            <div className="px-8 pt-8 pb-6">{children}</div>

            {/* Footer strip */}
            {showFooter && footerText && footerLinkLabel && footerLinkHref && (
              <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-500">
                {footerText}{" "}
                <Link
                  href={footerLinkHref}
                  className="font-semibold text-primary-600 hover:text-primary-700"
                >
                  {footerLinkLabel}
                </Link>
              </div>
            )}
          </div>

          {belowCard ? (
            <div className="w-full max-w-[480px] shrink-0">{belowCard}</div>
          ) : null}
          </div>
        </div>
      </div>

      {!hideRightPanel ? (rightPanel ?? <RightPanel />) : null}
    </div>
  );
}
