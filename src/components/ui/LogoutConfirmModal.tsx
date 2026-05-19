"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useScrollLock } from "@/lib/useScrollLock";

type LogoutConfirmModalProps = {
  open: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function LogoutConfirmModal({
  open,
  busy,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
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
        className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 shadow-2xl transition-all duration-500 ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-7 scale-90"
        }`}
      >
        <span className="absolute left-10 top-10 h-2.5 w-2.5 rounded-full bg-blue-300 animate-ping" />
        <span className="absolute right-12 top-16 h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
        <span className="absolute bottom-14 left-14 h-2 w-2 rounded-full bg-indigo-300 animate-ping" />
        <span className="absolute bottom-10 right-10 h-2.5 w-2.5 rounded-full bg-cyan-300 animate-ping" />
        <span className="absolute h-24 w-24 rounded-full border-2 border-blue-200/70 animate-pulse" />
        <span className="absolute h-32 w-32 rounded-full border border-emerald-200/60 animate-pulse [animation-delay:300ms]" />

        <div className="relative z-10 text-center">
          <style>{`
            @keyframes te-logout-exit {
              0%, 25%  { transform: translateX(0);    opacity: 1; }
              55%      { transform: translateX(14px); opacity: 0; }
              56%      { transform: translateX(-8px); opacity: 0; }
              85%,100% { transform: translateX(0);    opacity: 1; }
            }
          `}</style>
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm">
            <span className="absolute inset-0 rounded-full bg-red-400/25 animate-ping" />
            <LogOut
              className="h-7 w-7 relative"
              style={{ animation: "te-logout-exit 2s ease-in-out infinite" }}
            />
          </div>
          <p className="text-lg font-semibold text-slate-900">
            Log out?
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Are you sure you want to log out?
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Logging out..." : "Log Out"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Stay Here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
