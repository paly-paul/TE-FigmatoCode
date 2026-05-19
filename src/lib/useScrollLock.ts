import { useEffect } from "react";

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    // iOS Safari breaks position:fixed when overflow:hidden is set on body.
    // Fix: freeze the body with position:fixed at the current scroll offset instead.
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflowY = "scroll";
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.width = "";
      body.style.overflowY = "";
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
