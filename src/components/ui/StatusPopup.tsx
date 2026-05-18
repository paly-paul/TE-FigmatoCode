"use client";

import { CheckCircle2, X, AlertTriangle } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";

type StatusPopupVariant = "success" | "error";

type StatusPopupProps = {
  open: boolean;
  variant: StatusPopupVariant;
  title: string;
  message?: string;
  onClose: () => void;
};

function formatPhoneForDisplay(value: string): string {
  const normalized = value.trim();
  if (!/^\+\d{8,15}$/.test(normalized)) return value;

  const digits = normalized.slice(1);

  // Common NANP pattern (+1XXXXXXXXXX)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  // Common India pattern (+91XXXXXXXXXX)
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  return normalized;
}

function prettifyErrorText(value: string): string {
  return value
    .replace(/\bcontact_no\b/gi, "Contact Number")
    .replace(/\bcountry_code\b/gi, "Country Code")
    .replace(/\bfield\s+Contact Number\b/gi, "field Contact Number");
}

function renderMessageWithStrongSegments(message: string) {
  const strongTagPattern = /<strong>(.*?)<\/strong>/gi;
  const segments = message.split(strongTagPattern);
  if (segments.length === 1) return prettifyErrorText(formatPhoneForDisplay(message));

  return segments.map((segment, index) =>
    index % 2 === 1 ? (
      <strong key={`strong-${index}`} className="font-semibold text-gray-700">
        {prettifyErrorText(formatPhoneForDisplay(segment))}
      </strong>
    ) : (
      <span key={`text-${index}`}>{prettifyErrorText(formatPhoneForDisplay(segment))}</span>
    )
  );
}

export function StatusPopup({ open, variant, title, message, onClose }: StatusPopupProps) {
  useScrollLock(open);
  if (!open) return null;

  const isSuccess = variant === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-[570px] rounded-xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-10 sm:px-8 sm:pb-8">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              isSuccess ? "bg-blue-50 text-primary-600" : "bg-amber-100 text-amber-700"
            }`}
          >
            <Icon className="h-8 w-8" />
          </div>

          <div className="mx-auto mt-5 max-w-[420px] text-center">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            {message ? (
              <p className="mt-2 text-sm leading-6 text-gray-500">{renderMessageWithStrongSegments(message)}</p>
            ) : null}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
                isSuccess
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

