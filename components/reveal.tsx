"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Fades and lifts its children in once they scroll into view. Purely a
 * presentation layer: the children are always present in the server-rendered
 * HTML (just at opacity 0 until revealed), so nothing here can hide content
 * from a crawler, a reader-mode view, or a page viewed with JavaScript
 * disabled — `innerText` still reports text that's merely transparent, only
 * text that's `display:none` disappears from it.
 *
 * `prefers-reduced-motion` is handled in CSS (see `.reveal` in globals.css),
 * not here — the observer still runs, but the transition it triggers is
 * instant rather than animated.
 */
export function Reveal({
  children,
  className = "",
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Stagers siblings revealed by the same scroll trigger (e.g. a grid of cards). */
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
