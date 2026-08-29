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

  // Latest-ref mirrors so the reveal effect can key off the result URL alone —
  // depending on `job`/`onSliderChange` would cancel the sweep on every
  // unrelated context update (their identities change each render).
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

  const resultUrl = job.result?.url ?? null;

  // Reveal sweep when a new result arrives. Explanatory motion: 800ms easeOutQuart.
  useEffect(() => {
    if (!resultUrl) {
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
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [prefersReducedMotion, resultUrl]);

  return { cancelReveal, commitSlider, setSlider, slider };
};
