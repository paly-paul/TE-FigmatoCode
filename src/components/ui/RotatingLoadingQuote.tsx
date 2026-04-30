"use client";

import { useEffect, useMemo, useState } from "react";

const LOADING_QUOTES = [
  "Intelligently aligning talent with opportunity.",
  "Processing insights to identify the right fit.",
  "Optimizing recruitment through data-driven precision.",
  "Evaluating skills with advanced intelligence.",
  "Delivering better hiring decisions through AI.",
  "Transforming recruitment with intelligent automation.",
  "Analyzing profiles to uncover true potential.",
  "Enabling smarter workforce decisions.",
  "Refining matches through intelligent algorithms.",
  "Precision hiring, powered by AI.",
  "Connecting expertise with the right roles.",
  "Leveraging data to enhance hiring outcomes.",
  "Identifying capability beyond credentials.",
  "Enhancing recruitment efficiency with AI insights.",
  "Smart systems, stronger teams.",
  "Curating talent through intelligent analysis.",
  "Driving recruitment with predictive intelligence.",
  "Aligning skills, experience, and opportunity.",
  "Building high-performance teams through data.",
] as const;

function shuffledQuotes() {
  const items = [...LOADING_QUOTES];
  for (let idx = items.length - 1; idx > 0; idx -= 1) {
    const swapIndex = Math.floor(Math.random() * (idx + 1));
    const current = items[idx];
    items[idx] = items[swapIndex];
    items[swapIndex] = current;
  }
  return items;
}

export function RotatingLoadingQuote({
  intervalMs = 2400,
  className = "",
}: {
  intervalMs?: number;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [quotes, setQuotes] = useState<string[]>(() => shuffledQuotes());
  const [visible, setVisible] = useState(true);
  const fadeMs = 260;

  const activeQuote = useMemo(() => quotes[activeIndex] ?? LOADING_QUOTES[0], [quotes, activeIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setActiveIndex((prev) => {
          const next = prev + 1;
          if (next < quotes.length) return next;
          setQuotes(shuffledQuotes());
          return 0;
        });
        setVisible(true);
      }, fadeMs);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, quotes.length]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 px-4 py-3 ${className}`}>
      <div className="pointer-events-none absolute inset-0 animate-pulse bg-white/20" />
      <span className="pointer-events-none absolute left-2 top-1 text-3xl font-bold text-blue-300/80">"</span>
      <span className="pointer-events-none absolute bottom-0 right-2 text-3xl font-bold text-blue-300/80">"</span>
      <p
        className={`relative z-10 px-4 text-center text-base font-semibold text-slate-700 leading-relaxed transition-all duration-500 ease-out ${
          visible ? "translate-y-0 scale-100 opacity-100 blur-0" : "translate-y-1 scale-[0.98] opacity-0 blur-[1px]"
        }`}
      >
        "{activeQuote}"
      </p>
    </div>
  );
}

