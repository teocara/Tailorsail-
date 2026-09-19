"use client";

import { useEffect, useRef, useState } from "react";
import type { CatamaranSceneOptions } from "./catamaran-scene";

/**
 * Gate for the 3D hero.
 *
 * Three.js is fetched only from here, via a dynamic `import()` inside an
 * effect — never during prerendering (this runs nowhere near the server
 * build or the static export), and never at all on a device that cannot run
 * it. `GradientHero`, in `components/ui.tsx`, is the real page background
 * underneath: if WebGL is unavailable, the feature check fails, or the
 * module fails to load, nothing here ever mounts and the page looks exactly
 * as it did before this existed. That fallback costs nothing extra to
 * maintain — it is just what was already live.
 */
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export function CatamaranHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (supportsWebGL()) setMount(true);
  }, []);

  useEffect(() => {
    if (!mount) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    import("./catamaran-scene").then(({ default: mountScene }) => {
      if (cancelled) return;
      const options: CatamaranSceneOptions = {
        reducedMotion,
        onReady: () => setReady(true),
      };
      cleanup = mountScene(canvas, container, options);
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [mount]);

  return (
    <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-0">
      {mount ? (
        <canvas
          ref={canvasRef}
          className={`h-full w-full transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </div>
  );
}
