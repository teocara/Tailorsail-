"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Fades and lifts its children in once they scroll into view.
 *
 * Progressive enhancement, not a hiding mechanism: the server-rendered (and
 * no-JS) markup is always `reveal-visible` — full opacity — so content is
 * never dependent on JavaScript to be seen. Only once a browser confirms it
 * can actually run the reveal (React has mounted *and* `IntersectionObserver`
 * exists) does the layout effect flip an off-screen instance to hidden,
 * synchronously before the browser's first paint so there's no visible
 * flash — the intersection observer set up right after then brings it back
 * as the visitor scrolls to it. If JS never runs, or runs in a browser
 * without `IntersectionObserver`, the content simply stays at the visible
 * default forever, which is the correct, safe failure mode.
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
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const rect = el.getBoundingClientRect();
    const alreadyInView = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
    if (!alreadyInView) setVisible(false);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible || typeof IntersectionObserver === "undefined") return;

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
  }, [visible]);

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
