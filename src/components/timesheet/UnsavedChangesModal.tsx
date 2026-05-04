"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

type UnsavedChangesModalProps = {
  open: boolean;
  submitBusy: boolean;
  onSaveDraftAndContinue: () => void;
  onLeaveWithoutSaving: () => void;
  onStay: () => void;
};

export default function UnsavedChangesModal({
  open,
  submitBusy,
  onSaveDraftAndContinue,
  onLeaveWithoutSaving,
  onStay,
}: UnsavedChangesModalProps) {
  const [visible, setVisible] = useState(false);

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
        className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 shadow-2xl transition-all duration-500 ${
          visible
            ? "opacity-100 [transform:translateY(0)_scale(1)_rotateX(0deg)]"
            : "opacity-0 [transform:translateY(28px)_scale(0.9)_rotateX(10deg)]"
        }`}
      >
        <span className="absolute left-10 top-10 h-2.5 w-2.5 rounded-full bg-blue-300 animate-ping" />
        <span className="absolute right-12 top-16 h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
        <span className="absolute bottom-14 left-14 h-2 w-2 rounded-full bg-indigo-300 animate-ping" />
        <span className="absolute bottom-10 right-10 h-2.5 w-2.5 rounded-full bg-cyan-300 animate-ping" />
        <span className="absolute h-24 w-24 rounded-full border-2 border-blue-200/70 animate-pulse" />
        <span className="absolute h-32 w-32 rounded-full border border-emerald-200/60 animate-pulse [animation-delay:300ms]" />

        <div className="relative z-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-sm animate-bounce">
            <AlertTriangle className="h-7 w-7 animate-in zoom-in-75 duration-300" />
          </div>
          <p className="text-lg font-semibold text-slate-900 animate-in slide-in-from-bottom-1 duration-300">
            Unsaved changes detected
          </p>
          <p className="mt-2 text-sm text-slate-600 animate-in slide-in-from-bottom-1 duration-500">
            Save draft before leaving, otherwise your latest edits will be lost.
          </p>
          <div className="mx-auto mt-4 h-1.5 w-44 overflow-hidden rounded-full bg-amber-100">
            <span className="block h-full w-full rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="mt-6 flex flex-col gap-2 animate-in slide-in-from-bottom-1 duration-500">
            <button
              type="button"
              disabled={submitBusy}
              onClick={onSaveDraftAndContinue}
              className="rounded-xl bg-[#033CE5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Draft & Continue
            </button>
            <button
              type="button"
              onClick={onLeaveWithoutSaving}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Leave Without Saving
            </button>
            <button
              type="button"
              onClick={onStay}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Stay Here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
