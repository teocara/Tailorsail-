"use client";

import { useEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/lib/static-mode";

/**
 * Real drone footage for the home hero, replacing the procedural catamaran
 * scene with the operator's own aerial footage of boats at anchor — no
 * licensing or misrepresentation question here the way a stock clip would
 * raise, since it's footage the operator has the rights to and chose to use.
 *
 * Muted, looping, no audio track at all (stripped at encode time) so there's
 * nothing for autoplay-with-sound restrictions to block. The poster frame
 * renders immediately and stays the only thing shown for
 * `prefers-reduced-motion` or while the video element is still loading.
 */
export function HeroVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || reducedMotion) return;

    // Two independent reasons to pause, same as the 3D hero it replaces:
    // scrolled out of view, or the tab itself is hidden. Both have to clear
    // before playback resumes.
    let isIntersecting = true;

    function updatePlayback() {
      const shouldPlay = !document.hidden && isIntersecting;
      if (!video) return;
      if (shouldPlay && video.paused) {
        video.play().catch(() => {
          // Autoplay can be blocked by the browser even though the element is
          // muted (rare, but happens on some mobile power-saving modes) — the
          // poster frame stays visible either way, so there's nothing to
          // recover from here.
        });
      } else if (!shouldPlay && !video.paused) {
        video.pause();
      }
    }

    document.addEventListener("visibilitychange", updatePlayback);
    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting;
        updatePlayback();
      },
      { threshold: 0.01 },
    );
    observer.observe(container);

    return () => {
      document.removeEventListener("visibilitychange", updatePlayback);
      observer.disconnect();
    };
  }, [reducedMotion]);

  return (
    <div ref={containerRef} aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Always present, so there's something to show before the video
          loads, if it fails, and permanently for prefers-reduced-motion. */}
      <img
        src={`${BASE_PATH}/video/hero-poster.jpg`}
        alt=""
        className="h-full w-full object-cover"
      />
      {!reducedMotion ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          poster={`${BASE_PATH}/video/hero-poster.jpg`}
          muted
          loop
          playsInline
          preload="auto"
        >
          {/* WebM/VP9 first: smaller at the same quality, and the format a
              from-source build of Chromium (no proprietary codecs) can
              actually decode. The MP4/H.264 fallback is what covers Safari,
              where native VP9 support is spotty to absent. */}
          <source src={`${BASE_PATH}/video/hero.webm`} type="video/webm" />
          <source src={`${BASE_PATH}/video/hero.mp4`} type="video/mp4" />
        </video>
      ) : null}
      {/* Scrim so the headline and search box stay legible over bright water
          and sand rather than only over the navy end of the gradient. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(10,22,40,0.75) 0%, rgba(10,22,40,0.35) 45%, rgba(10,22,40,0.55) 100%)",
        }}
      />
    </div>
  );
}
