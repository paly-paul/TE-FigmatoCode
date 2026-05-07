"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

type JobSuccessPopupProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export function JobSuccessPopup({ open, title, message, onClose }: JobSuccessPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[220] flex items-center justify-center px-4 transition-all duration-300 ${
        visible ? "bg-black/45 opacity-100" : "bg-black/0 opacity-0"
      }`}
    >
      <style>{`
        @keyframes te-success-pop {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          55%  { transform: scale(1.3) rotate(6deg);  opacity: 1; }
          72%  { transform: scale(0.9) rotate(-3deg); }
          86%  { transform: scale(1.08) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg);   opacity: 1; }
        }
        @keyframes te-success-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.45); }
          50%       { box-shadow: 0 0 0 12px rgba(16,185,129,0);  }
        }
        @keyframes te-check-draw {
          0%   { stroke-dashoffset: 100; opacity: 0.4; }
          60%  { stroke-dashoffset: 0;   opacity: 1;   }
          80%  { stroke-dashoffset: -4;  }
          100% { stroke-dashoffset: 0;   opacity: 1;   }
        }
        @keyframes te-success-float {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-5px); }
        }
      `}</style>

      <div
        className={`relative w-full max-w-[450px] overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 shadow-2xl transition-all duration-500 ${
          visible
            ? "opacity-100 [transform:translateY(0)_scale(1)_rotateX(0deg)]"
            : "opacity-0 [transform:translateY(28px)_scale(0.9)_rotateX(10deg)]"
        }`}
      >
        {/* Confetti dots — staggered delays */}
        <span className="absolute left-8  top-8  h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="absolute right-10 top-12 h-2   w-2   rounded-full bg-blue-300   animate-ping [animation-delay:200ms]" />
        <span className="absolute left-16  top-20 h-1.5 w-1.5 rounded-full bg-yellow-300 animate-ping [animation-delay:400ms]" />
        <span className="absolute right-8  top-20 h-2   w-2   rounded-full bg-indigo-300 animate-ping [animation-delay:150ms]" />
        <span className="absolute bottom-12 left-10  h-2   w-2   rounded-full bg-cyan-300   animate-ping [animation-delay:300ms]" />
        <span className="absolute bottom-8  right-14 h-2.5 w-2.5 rounded-full bg-pink-300   animate-ping [animation-delay:500ms]" />
        <span className="absolute bottom-16 right-8  h-1.5 w-1.5 rounded-full bg-teal-300   animate-ping [animation-delay:100ms]" />

        {/* Pulse rings */}
        <span className="absolute h-28 w-28 rounded-full border-2 border-emerald-200/70 animate-pulse" />
        <span className="absolute h-36 w-36 rounded-full border border-blue-200/50 animate-pulse [animation-delay:400ms]" />
        <span className="absolute h-44 w-44 rounded-full border border-emerald-100/40 animate-pulse [animation-delay:700ms]" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Icon container — pop-in + float + glow ring */}
          <div
            className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-md"
            style={{
              animation:
                "te-success-pop 0.65s cubic-bezier(0.22,1,0.36,1) both, te-success-float 3s ease-in-out 0.8s infinite, te-success-glow 2s ease-in-out 0.8s infinite",
            }}
          >
            <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
            <CheckCircle2 className="relative h-9 w-9" />
          </div>

          <p
            className="text-xl font-semibold text-slate-900 animate-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            {title}
          </p>
          <p
            className="mt-2 text-sm text-slate-600 animate-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: "220ms", animationFillMode: "both" }}
          >
            {message}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 animate-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: "320ms", animationFillMode: "both" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
