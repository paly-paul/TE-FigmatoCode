import { BREAKPOINTS } from "@/lib/useResponsive";

export const MOBILE_MQ = `(max-width: ${BREAKPOINTS.tablet - 1}px)`;

export function getViewportIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_MQ).matches;
}
