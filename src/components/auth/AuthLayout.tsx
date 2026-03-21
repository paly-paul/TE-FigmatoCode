import { ReactNode } from "react";
import Link from "next/link";
import { RightPanel } from "./RightPanel";

interface AuthLayoutProps {
  children: ReactNode;
  footerText?: string;
  footerLinkLabel?: string;
  footerLinkHref?: string;
  showFooter?: boolean;
}

export function AuthLayout({
  children,
  footerText,
  footerLinkLabel,
  footerLinkHref,
  showFooter = false,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/*  Left Panel  */}
      <div className="flex flex-col w-full lg:w-[45%] bg-[#F3F4F6] relative">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-8 pt-7 pb-0">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm tracking-wide">
              TE
            </span>
          </div>
          <span className="font-semibold text-gray-800 text-base">
            Talent Engine
          </span>
        </div>

        {/* Card container — grows to fill remaining height */}
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          {/* White card */}
          <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-sm overflow-hidden">
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
        </div>
      </div>

      {/*  Right Panel  */}
      <RightPanel />
    </div>
  );
}
