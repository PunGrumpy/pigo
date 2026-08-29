"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (onStoreChange: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
};

const getSnapshot = () => window.matchMedia(QUERY).matches;

// The server cannot know the preference; assume motion is allowed and let the
// client snapshot correct it on hydration.
const getServerSnapshot = () => false;

/**
 * Tracks `prefers-reduced-motion` and re-renders when the OS setting changes,
 * so a mid-session toggle takes effect without a reload.
 */
export const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
