"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (duration: string) => boolean | Promise<boolean>;
}

export default function PauseJobSearchModal({
  open,
  onClose,
  onSave,
}: Props) {
  const [selected, setSelected] = useState("3");
  const [visible, setVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Handle mount/unmount animation
  useEffect(() => {
    if (open) {
      setVisible(true);
      setShowSuccess(false);
      setSaving(false);
    } else {
      setShowSuccess(false);
      setSaving(false);
      const timeout = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-opacity duration-200 ${
        open ? "bg-black/40 opacity-100" : "bg-black/0 opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          w-full max-w-md bg-white rounded-xl shadow-xl p-6 relative min-h-[200px]
          transform transition-all duration-200 ease-out
          ${
            open
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4"
          }
        `}
      >
        {showSuccess ? (
          <div className="absolute inset-0 z-20 rounded-xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative flex h-full min-h-[280px] flex-col items-center justify-center text-center overflow-hidden">
              <span className="absolute left-12 top-16 h-2.5 w-2.5 rounded-full bg-blue-300 animate-ping" />
              <span className="absolute right-14 top-20 h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
              <span className="absolute bottom-20 left-16 h-2 w-2 rounded-full bg-indigo-300 animate-ping" />
              <span className="absolute bottom-16 right-12 h-2.5 w-2.5 rounded-full bg-cyan-300 animate-ping" />
              <span className="absolute h-24 w-24 rounded-full border-2 border-blue-200/70 animate-pulse" />
              <span className="absolute h-32 w-32 rounded-full border border-emerald-200/60 animate-pulse [animation-delay:300ms]" />
              <div className="mb-4 rounded-full bg-emerald-100 p-3 text-emerald-600 shadow-sm animate-bounce">
                <CheckCircle2 className="h-8 w-8 animate-in zoom-in-75 duration-300" />
              </div>
              <p className="text-xl font-semibold text-gray-900 animate-in slide-in-from-bottom-1 duration-300">
                Preference Saved
              </p>
              <p className="mt-2 text-sm text-gray-600 animate-in slide-in-from-bottom-1 duration-500 px-4">
                Your job search is paused until the time you selected. You can resume anytime from the dashboard.
              </p>
              <div className="mt-4 h-1.5 w-44 overflow-hidden rounded-full bg-blue-100">
                <span className="block h-full w-full rounded-full bg-blue-500 animate-pulse" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                }}
                className="mt-5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}

        {/* CLOSE */}
        <button
          type="button"
          onClick={onClose}
          disabled={showSuccess || saving}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 disabled:pointer-events-none disabled:opacity-40"
          aria-disabled={showSuccess || saving}
        >
          <X size={18} />
        </button>

        {/* TITLE */}
        <h2 className="text-lg font-semibold mb-2">
          Pause Job Search?
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Let recruiters know when you’ll be available next for new opportunities
        </p>

        {/* OPTIONS */}
        <div className="border rounded-lg p-4 mb-4 space-y-3">
          <p className="text-sm font-medium">Choose an option</p>

          {[
            { label: "After 3 Months", value: "3" },
            { label: "After 6 Months", value: "6" },
            { label: "After 9 Months", value: "9" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="radio"
                checked={selected === option.value}
                onChange={() => setSelected(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>

        {/* INFO */}
        <div className="bg-blue-50 text-blue-700 text-xs rounded-md p-3 mb-4">
          While paused, recruiters won’t consider you for opportunities.
        </div>

        {/* ACTION */}
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            void (async () => {
              setSaving(true);
              try {
                const ok = await Promise.resolve(onSave(selected));
                if (ok) {
                  setShowSuccess(true);
                  window.setTimeout(() => {
                    setShowSuccess(false);
                    onClose();
                  }, 3200);
                } else {
                  onClose();
                }
              } finally {
                setSaving(false);
              }
            })();
          }}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-70 disabled:pointer-events-none"
        >
          {saving ? "Saving…" : "Save Preference"}
        </button>
      </div>
    </div>
  );
}