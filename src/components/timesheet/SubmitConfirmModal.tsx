"use client";

import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useScrollLock } from "@/lib/useScrollLock";

type SubmitConfirmModalProps = {
  open: boolean;
  submitBusy: boolean;
  actionLabel: string;
  weekRange: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function SubmitConfirmModal({
  open,
  submitBusy,
  actionLabel,
  weekRange,
  onConfirm,
  onCancel,
}: SubmitConfirmModalProps) {
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
        className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-2xl transition-all duration-500 ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-7 scale-90"
        }`}
      >
        <span className="absolute left-10 top-10 h-2.5 w-2.5 rounded-full bg-blue-300 animate-ping" />
        <span className="absolute right-12 top-16 h-2 w-2 rounded-full bg-indigo-300 animate-ping" />
        <span className="absolute bottom-14 left-14 h-2 w-2 rounded-full bg-blue-200 animate-ping" />
        <span className="absolute bottom-10 right-10 h-2.5 w-2.5 rounded-full bg-cyan-300 animate-ping" />
        <span className="absolute h-24 w-24 rounded-full border-2 border-blue-200/70 animate-pulse" />
        <span className="absolute h-32 w-32 rounded-full border border-indigo-200/60 animate-pulse [animation-delay:300ms]" />

        <div className="relative z-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700 shadow-sm">
            <CheckCircle className="h-7 w-7" />
          </div>
          <p className="text-lg font-semibold text-slate-900">
            Confirm {actionLabel}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            You are about to submit your timesheet for{" "}
            <span className="font-semibold text-slate-800">{weekRange}</span>.
          </p>
          <p className="mt-1 text-sm text-amber-700 font-medium">
            Once submitted, this timesheet cannot be edited.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              disabled={submitBusy}
              onClick={onConfirm}
              className="rounded-xl bg-[#033CE5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitBusy ? "Submitting..." : `Yes, ${actionLabel}`}
            </button>
            <button
              type="button"
              disabled={submitBusy}
              onClick={onCancel}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
