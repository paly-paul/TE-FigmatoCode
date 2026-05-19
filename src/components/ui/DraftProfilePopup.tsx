"use client";

import { useEffect, useState } from "react";
import { PencilLine } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";

type DraftProfilePopupProps = {
  open: boolean;
  onContinueEditing: () => void;
  onDoItLater: () => void;
};

export function DraftProfilePopup({ open, onContinueEditing, onDoItLater }: DraftProfilePopupProps) {
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
        className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-2xl transition-all duration-500 ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-7 scale-90"
        }`}
      >
        <span className="absolute left-10 top-10 h-2.5 w-2.5 rounded-full bg-amber-300 animate-ping" />
        <span className="absolute right-12 top-16 h-2 w-2 rounded-full bg-orange-300 animate-ping" />
        <span className="absolute bottom-14 left-14 h-2 w-2 rounded-full bg-yellow-300 animate-ping" />
        <span className="absolute bottom-10 right-10 h-2.5 w-2.5 rounded-full bg-amber-200 animate-ping" />
        <span className="absolute h-24 w-24 rounded-full border-2 border-amber-200/70 animate-pulse" />
        <span className="absolute h-32 w-32 rounded-full border border-orange-200/60 animate-pulse [animation-delay:300ms]" />

        <div className="relative z-10 text-center">
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm">
            <span className="absolute inset-0 rounded-full bg-amber-400/25 animate-ping" />
            <PencilLine className="relative h-7 w-7" />
          </div>

          <p className="text-lg font-semibold text-slate-900">
            Profile in Draft
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Your profile is currently in draft status.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            You have unsaved or incomplete changes pending. Would you like to continue updating your profile now or finish it later?
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onContinueEditing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#174EE7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <PencilLine className="h-4 w-4" />
              Continue Editing
            </button>
            <button
              type="button"
              onClick={onDoItLater}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Do It Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
