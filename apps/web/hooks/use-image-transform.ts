"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const BUTTON_ZOOM_STEP = 1.5;
const WHEEL_ZOOM_STEP = 1.15;
const PAN_LIMIT_PER_ZOOM_LEVEL = 400;

export { MIN_ZOOM, MAX_ZOOM };

export interface Transform {
  /**
   * Whether this transform should be eased into. Button zoom and reset are
   * deliberate jumps that read better animated; wheel zoom and pan track a
   * continuous gesture, and easing them makes the image lag the input.
   */
  animate: boolean;
  pan: { x: number; y: number };
  zoom: number;
}

const IDENTITY: Transform = {
  animate: false,
  pan: { x: 0, y: 0 },
  zoom: MIN_ZOOM,
};

const clampZoom = (zoom: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

const clampPan = (value: number, limit: number) =>
  Math.min(limit, Math.max(-limit, value));

/**
 * Zoom and pan for a pinned image viewport.
 *
 * Wheel ticks and pan deltas arrive faster than the screen refreshes, so they
 * accumulate in refs and settle into a single state update per frame.
 */
export const useImageTransform = (
  targetRef: React.RefObject<HTMLElement | null>,
  wheelEnabled: boolean
) => {
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [isPanning, setIsPanning] = useState(false);

  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  });

  const startPanRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const pendingZoomTicksRef = useRef(0);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);

  const schedule = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const ticks = pendingZoomTicksRef.current;
      const pan = pendingPanRef.current;
      pendingZoomTicksRef.current = 0;
      pendingPanRef.current = null;

      if (ticks === 0 && !pan) {
        return;
      }

      setTransform((prev) => {
        let { pan: nextPan, zoom } = prev;

        if (ticks !== 0) {
          zoom = clampZoom(prev.zoom * WHEEL_ZOOM_STEP ** ticks);
          nextPan =
            zoom === MIN_ZOOM
              ? { x: 0, y: 0 }
              : {
                  x: prev.pan.x * (zoom / prev.zoom),
                  y: prev.pan.y * (zoom / prev.zoom),
                };
        }

        if (pan) {
          const limit = (zoom - MIN_ZOOM) * PAN_LIMIT_PER_ZOOM_LEVEL;
          nextPan = { x: clampPan(pan.x, limit), y: clampPan(pan.y, limit) };
        }

        return { animate: false, pan: nextPan, zoom };
      });
    });
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    const element = targetRef.current;
    if (!(element && wheelEnabled)) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      pendingZoomTicksRef.current += event.deltaY < 0 ? 1 : -1;
      schedule();
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
    };
  }, [schedule, targetRef, wheelEnabled]);

  const beginPan = useCallback((clientX: number, clientY: number) => {
    const { pan } = transformRef.current;
    startPanRef.current = { x: clientX - pan.x, y: clientY - pan.y };
    setIsPanning(true);
  }, []);

  const movePan = useCallback(
    (clientX: number, clientY: number) => {
      pendingPanRef.current = {
        x: clientX - startPanRef.current.x,
        y: clientY - startPanRef.current.y,
      };
      schedule();
    },
    [schedule]
  );

  const endPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      animate: true,
      pan: prev.pan,
      zoom: clampZoom(prev.zoom * BUTTON_ZOOM_STEP),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((prev) => {
      const zoom = clampZoom(prev.zoom / BUTTON_ZOOM_STEP);
      return {
        animate: true,
        pan: zoom === MIN_ZOOM ? { x: 0, y: 0 } : prev.pan,
        zoom,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setTransform({ animate: true, pan: { x: 0, y: 0 }, zoom: MIN_ZOOM });
  }, []);

  return {
    beginPan,
    endPan,
    isPanning,
    movePan,
    reset,
    transform,
    zoomIn,
    zoomOut,
  };
};
