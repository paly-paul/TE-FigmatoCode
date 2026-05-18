"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useScrollLock } from "@/lib/useScrollLock";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type LegalHtmlModalProps = {
  open: boolean;
  title: string;
  src: string; // URL to an HTML file (served from /public)
  onClose: () => void;
  onNavigate?: (target: "terms" | "privacy") => void;
};

export default function LegalHtmlModal({
  open,
  title,
  src,
  onClose,
  onNavigate,
}: LegalHtmlModalProps) {
  const [visible, setVisible] = useState(false);
  const [htmlBody, setHtmlBody] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !src) return;
    let active = true;
    setLoading(true);
    void fetch(src)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error("Unable to load legal content"))))
      .then((rawHtml) => {
        if (!active) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        const body = doc.body?.innerHTML?.trim() || rawHtml;
        setHtmlBody(body);
      })
      .catch(() => {
        if (!active) return;
        setHtmlBody("<p>Unable to load this document right now. Please try again.</p>");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, src]);

  useEffect(() => {
    if (!open) return;
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [open, src]);

  function handleLegalContentClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor || !onNavigate) return;
    const href = anchor.getAttribute("href") || "";
    const normalized = href.toLowerCase();

    if (
      normalized.includes("privacy_policy") ||
      normalized.includes("privacy-policy") ||
      normalized.includes("privacy")
    ) {
      e.preventDefault();
      onNavigate("privacy");
      return;
    }

    if (
      normalized.includes("t%26c") ||
      normalized.includes("t&c") ||
      normalized.includes("terms-and-conditions") ||
      normalized.includes("terms")
    ) {
      e.preventDefault();
      onNavigate("terms");
    }
  }

  if (!open) return null;

  const node =
    typeof document !== "undefined"
      ? createPortal(
          <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 transition-opacity duration-300 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className="absolute inset-0 bg-black/45"
              onClick={() => onClose()}
              role="button"
              tabIndex={-1}
              aria-label="Close"
            />

            <div
              className={`relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 transition-all duration-300 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm sm:text-base font-semibold text-gray-900">{title}</h2>
                <button
                  type="button"
                  className="rounded-md p-1 hover:bg-gray-100"
                  onClick={() => onClose()}
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              <div
                ref={scrollContainerRef}
                className="bg-white h-[70vh] sm:h-[75vh] overflow-y-auto"
              >
                <style>{`
                  .legal-modal-content .terms-container,
                  .legal-modal-content .policy-container {
                    margin: 0;
                    padding: 0;
                  }
                  .legal-modal-content h1 {
                    margin: 0 0 0.75rem 0;
                    font-size: 1.6rem;
                    line-height: 1.3;
                    color: #111827;
                  }
                  .legal-modal-content h2 {
                    margin: 1.1rem 0 0.45rem;
                    font-size: 1.05rem;
                    line-height: 1.45;
                    color: #111827;
                  }
                  .legal-modal-content h3 {
                    margin: 0.9rem 0 0.4rem;
                    font-size: 0.98rem;
                    line-height: 1.4;
                    color: #111827;
                  }
                  .legal-modal-content p {
                    margin: 0.45rem 0;
                  }
                  .legal-modal-content ul,
                  .legal-modal-content ol {
                    margin: 0.35rem 0 0.7rem 1.05rem;
                    padding-left: 0.45rem;
                  }
                  .legal-modal-content li {
                    margin: 0.2rem 0;
                  }
                  .legal-modal-content a {
                    color: #2563eb;
                    text-decoration: none;
                  }
                  .legal-modal-content a:hover {
                    text-decoration: none;
                  }
                  @media (max-width: 640px) {
                    .legal-modal-content h1 {
                      font-size: 1.35rem;
                    }
                    .legal-modal-content h2 {
                      font-size: 1rem;
                    }
                  }
                `}</style>
                {loading ? (
                  <div className="px-4 sm:px-6 py-5 text-sm text-gray-600">Loading...</div>
                ) : null}
                <div
                  className="legal-modal-content px-4 sm:px-6 py-4 sm:py-5 text-[13px] sm:text-sm leading-6 text-gray-700"
                  onClick={handleLegalContentClick}
                  dangerouslySetInnerHTML={{ __html: htmlBody }}
                />
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return node;
}

