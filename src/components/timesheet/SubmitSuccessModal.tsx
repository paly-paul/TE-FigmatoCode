"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useScrollLock } from "@/lib/useScrollLock";

type SubmitSuccessModalProps = {
  open: boolean;
  actionLabel: string;
  weekRange: string;
  onClose: () => void;
};

export default function SubmitSuccessModal({
  open,
  actionLabel,
  weekRange,
  onClose,
}: SubmitSuccessModalProps) {
  const [visible, setVisible] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center px-4 transition-all duration-300 ${
        visible ? "bg-black/45 opacity-100" : "bg-black/0 opacity-0"
      }`}
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6 shadow-2xl transition-all duration-500 ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-7 scale-90"
        }`}
      >
        <span className="absolute left-10 top-10 h-2.5 w-2.5 rounded-full bg-emerald-300 animate-ping" />
        <span className="absolute right-12 top-16 h-2 w-2 rounded-full bg-blue-300 animate-ping" />
        <span className="absolute bottom-14 left-14 h-2 w-2 rounded-full bg-emerald-200 animate-ping" />
        <span className="absolute bottom-10 right-10 h-2.5 w-2.5 rounded-full bg-cyan-300 animate-ping" />
        <span className="absolute h-24 w-24 rounded-full border-2 border-emerald-200/70 animate-pulse" />
        <span className="absolute h-32 w-32 rounded-full border border-blue-200/60 animate-pulse [animation-delay:300ms]" />

        <div className="relative z-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold text-slate-900">
            {actionLabel} Successful!
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Your timesheet for{" "}
            <span className="font-semibold text-slate-800">{weekRange}</span>{" "}
            has been submitted successfully.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Your manager will review and approve it shortly.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
