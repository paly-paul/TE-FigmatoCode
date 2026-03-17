"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (duration: string) => void;
}

export default function PauseJobSearchModal({
  open,
  onClose,
  onSave,
}: Props) {
  const [selected, setSelected] = useState("3");
  const [visible, setVisible] = useState(false);

  // Handle mount/unmount animation
  useEffect(() => {
    if (open) {
      setVisible(true);
    } else {
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
          w-full max-w-md bg-white rounded-xl shadow-xl p-6 relative
          transform transition-all duration-200 ease-out
          ${
            open
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4"
          }
        `}
      >
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
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
          onClick={() => onSave(selected)}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          Save Preference
        </button>
      </div>
    </div>
  );
}