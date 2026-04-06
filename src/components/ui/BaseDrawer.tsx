"use client";

import { ReactNode, RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export type DrawerPlacement = "right" | "bottom";

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
  /** `right` = slide from right (desktop). `bottom` = bottom sheet (mobile). */
  placement?: DrawerPlacement;
  /** Extra class on the panel (e.g. safe-area). */
  panelClassName?: string;
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
  placement = "right",
  panelClassName = "",
}: BaseDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const isBottom = placement === "bottom";
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setRendered(false), 300);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useLayoutEffect(() => {
    if (!rendered || !open) return;

    // Force one paint in the hidden position before activating the transition.
    setVisible(false);
    const timeout = window.setTimeout(() => setVisible(true), 20);
    return () => window.clearTimeout(timeout);
  }, [rendered, open]);

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

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [open]);

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

  if (!rendered) return null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 overscroll-none bg-black/20 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className={`z-50 flex flex-col overscroll-contain bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isBottom
            ? `fixed bottom-0 left-0 right-0 max-h-[min(92svh,900px)] w-full rounded-t-2xl ${
                visible ? "translate-y-0" : "translate-y-full"
              } ${panelClassName}`
            : `fixed top-0 right-0 h-full w-full ${widthClassName} ${
                visible ? "translate-x-0" : "translate-x-full"
              }`
        }`}
      >
        {isBottom ? (
          <div className="flex shrink-0 justify-center pt-2 pb-1" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>
        ) : null}

        <div
          className={`flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 ${
            isBottom ? "pt-1" : ""
          }`}
        >
          <h2 className="min-w-0 shrink pr-1 text-base font-semibold text-gray-900">
            {title}
          </h2>

          <div className="flex shrink-0 items-center gap-5">
            {headerActions ? (
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
                {headerActions}
              </div>
            ) : null}
            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
                aria-label={`Close ${title}`}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>
          <div className={contentClassName}>{children}</div>
        </div>

        {footer ? (
          <div
            className={`shrink-0 border-t border-gray-100 ${
              isBottom ? "px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3" : "px-5 py-4"
            }`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
}
