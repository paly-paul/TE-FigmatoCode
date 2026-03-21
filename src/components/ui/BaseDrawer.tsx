"use client";

import { ReactNode, RefObject, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface BaseDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  triggerRef?: RefObject<HTMLElement>;
  widthClassName?: string;
  headerActions?: ReactNode;
  ariaLabel?: string;
  bodyClassName?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
}

export function BaseDrawer({
  open,
  onClose,
  title,
  children,
  footer,
  triggerRef,
  widthClassName = "sm:w-[420px]",
  headerActions,
  ariaLabel,
  bodyClassName = "px-5 py-5",
  contentClassName = "space-y-6",
  showCloseButton = true,
}: BaseDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        drawerRef.current?.contains(target) ||
        triggerRef?.current?.contains(target)
      ) {
        return;
      }

      onClose();
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, onClose, triggerRef]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className={`fixed top-0 right-0 h-full w-full ${widthClassName} bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>

          <div className="flex items-center gap-3">
            {headerActions}
            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                aria-label={`Close ${title}`}
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
          <div className={contentClassName}>{children}</div>
        </div>

        {footer ? (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
}
