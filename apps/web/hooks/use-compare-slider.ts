"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ImageJob } from "@/lib/image/types";

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

const REVEAL_DURATION_MS = 800;
const REVEAL_TARGET = 50;

/**
 * Owns the before/after divider position.
 *
 * The divider is presentation state, so it lives here rather than on the job:
 * a drag re-renders only the preview subtree instead of pushing a new job list
 * through the whole app on every pointer move. The resting value is committed
 * back to the job when the gesture ends.
 */
export const useCompareSlider = (
  job: ImageJob,
  onSliderChange: (job: ImageJob, value: number) => void
) => {
  const [slider, setSlider] = useState(job.slider);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Latest-ref mirrors so the reveal effect depends on whether a result exists
  // and nothing else — depending on `job`/`onSliderChange` would cancel the
  // sweep on every unrelated context update (their identities change each
  // render).
  const jobRef = useRef(job);
  const onSliderChangeRef = useRef(onSliderChange);
  useEffect(() => {
    jobRef.current = job;
    onSliderChangeRef.current = onSliderChange;
  });

  const frameRef = useRef<number | null>(null);
  const cancelReveal = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const commitSlider = useCallback((value: number) => {
    if (jobRef.current.slider !== value) {
      onSliderChangeRef.current(jobRef.current, value);
    }
  }, []);

  const hasResult = Boolean(job.result);
  // Set once a sweep finishes. Later results (a settings change) replace the
  // image under the divider without moving it. Marked on completion rather
  // than on start so a Strict Mode effect replay still runs the sweep.
  const sweptRef = useRef(false);

  // Reveal sweep for the first result of this row. Explanatory motion: 800ms easeOutQuart.
  useEffect(() => {
    if (!hasResult || sweptRef.current) {
      return;
    }

    // Commit the resting value once; the sweep itself stays local.
    if (jobRef.current.slider !== REVEAL_TARGET) {
      onSliderChangeRef.current(jobRef.current, REVEAL_TARGET);
    }

    // Reduced motion runs the same loop with no duration: it lands on the
    // resting value on the first frame instead of sweeping to it.
    const duration = prefersReducedMotion ? 0 : REVEAL_DURATION_MS;

    let start: number | null = null;
    const step = (timestamp: number) => {
      start ??= timestamp;
      const progress =
        duration === 0 ? 1 : Math.min((timestamp - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 4;
      setSlider(Math.round(REVEAL_TARGET * eased));
      frameRef.current = progress < 1 ? requestAnimationFrame(step) : null;
      sweptRef.current = progress >= 1;
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [prefersReducedMotion, hasResult]);

  return { cancelReveal, commitSlider, setSlider, slider };
};
