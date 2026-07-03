"use client";

import { Button } from "@vercel/geistdocs/components/button";
import { Spinner } from "@vercel/geistdocs/components/spinner";
import {
  ChevronsLeftRight,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState, useEffect } from "react";

import { isJobPending } from "@/lib/image/job";
import type { ImageJob } from "@/lib/image/types";
import { cn } from "@/lib/utils";

interface OptimizerPreviewProps {
  job: ImageJob;
  onDownload: (job: ImageJob) => void;
  onRemove: (job: ImageJob) => void;
  onSliderChange: (job: ImageJob, value: number) => void;
}

interface ZoomControlsProps {
  zoom: number;
  setTransform: React.Dispatch<
    React.SetStateAction<{ zoom: number; pan: { x: number; y: number } }>
  >;
}

const ZoomControls = ({ zoom, setTransform }: ZoomControlsProps) => (
  <div
    className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gray-alpha-300 bg-background-100/90 px-2 py-1 shadow-sm backdrop-blur-md"
    onPointerCancel={(e) => e.stopPropagation()}
    onPointerDown={(e) => e.stopPropagation()}
    onPointerMove={(e) => e.stopPropagation()}
    onPointerUp={(e) => e.stopPropagation()}
  >
    <Button
      size="icon-sm"
      variant="ghost"
      className="rounded-full"
      disabled={zoom <= 1}
      onClick={() => {
        setTransform((prev) => {
          const next = Math.max(1, prev.zoom / 1.5);
          return {
            pan: next === 1 ? { x: 0, y: 0 } : prev.pan,
            zoom: next,
          };
        });
      }}
    >
      <ZoomOut className="size-3 text-gray-800" />
    </Button>
    <span className="min-w-[3.5rem] text-center text-[11px] font-mono font-medium text-gray-1000">
      {Math.round(zoom * 100)}%
    </span>
    <Button
      size="icon-sm"
      variant="ghost"
      className="rounded-full"
      disabled={zoom >= 8}
      onClick={() => {
        setTransform((prev) => ({
          ...prev,
          zoom: Math.min(8, prev.zoom * 1.5),
        }));
      }}
    >
      <ZoomIn className="size-3 text-gray-800" />
    </Button>
    {zoom > 1 && (
      <Button
        className="ml-1 text-[11px] px-2 h-8 flex items-center gap-1 animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-150 ease-out cursor-pointer rounded-full"
        size="sm"
        variant="ghost"
        onClick={() => {
          setTransform({ pan: { x: 0, y: 0 }, zoom: 1 });
        }}
      >
        <RotateCcw className="size-3 text-gray-800" />
        Reset
      </Button>
    )}
  </div>
);

export const OptimizerPreview = ({
  job,
  onDownload,
  onRemove,
  onSliderChange,
}: OptimizerPreviewProps) => {
  const compareRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ pan: { x: 0, y: 0 }, zoom: 1 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastResultUrlRef = useRef<string | null>(null);

  // Micro-animation on load
  useEffect(() => {
    if (job.result && lastResultUrlRef.current !== job.result.url) {
      lastResultUrlRef.current = job.result.url;

      let start: number | null = null;
      // Duration of animation: 800ms
      const duration = 800;
      const initialValue = 0;
      const targetValue = 50;

      const animate = (timestamp: number) => {
        if (!start) {
          start = timestamp;
        }
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function: easeOutQuart
        const ease = 1 - (1 - progress) ** 4;
        const nextValue = initialValue + (targetValue - initialValue) * ease;

        onSliderChange(job, Math.round(nextValue));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      onSliderChange(job, initialValue);
      requestAnimationFrame(animate);
    }
  }, [job, onSliderChange]);

  // Wheel Zoom event listener
  useEffect(() => {
    const el = compareRef.current;
    if (!el) {
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      if (!job.result) {
        return;
      }
      e.preventDefault();

      const zoomFactor = 1.15;
      setTransform((prev) => {
        const nextZoom =
          e.deltaY < 0
            ? Math.min(8, prev.zoom * zoomFactor)
            : Math.max(1, prev.zoom / zoomFactor);

        return {
          pan:
            nextZoom === 1
              ? { x: 0, y: 0 }
              : {
                  x: prev.pan.x * (nextZoom / prev.zoom),
                  y: prev.pan.y * (nextZoom / prev.zoom),
                },
          zoom: nextZoom,
        };
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [job.result]);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const rect = compareRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const value = Math.min(
        100,
        Math.max(0, ((clientX - rect.left) / rect.width) * 100)
      );
      onSliderChange(job, Math.round(value));
    },
    [job, onSliderChange]
  );

  const onComparePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!job.result) {
      return;
    }
    event.preventDefault();

    const rect = compareRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const clickXPercent = ((event.clientX - rect.left) / rect.width) * 100;
    // Check if pointer is within 5% range of divider
    const isNearDivider = Math.abs(clickXPercent - job.slider) < 5;

    event.currentTarget.setPointerCapture(event.pointerId);

    if (transform.zoom > 1 && !isNearDivider) {
      setIsPanning(true);
      startPanRef.current = {
        x: event.clientX - transform.pan.x,
        y: event.clientY - transform.pan.y,
      };
    } else {
      setIsDragging(true);
      updateFromPointer(event.clientX);
    }
  };

  const onComparePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateFromPointer(event.clientX);
    } else if (isPanning) {
      const nextX = event.clientX - startPanRef.current.x;
      const nextY = event.clientY - startPanRef.current.y;

      const maxPanX = (transform.zoom - 1) * 400;
      const maxPanY = (transform.zoom - 1) * 400;

      setTransform((prev) => ({
        ...prev,
        pan: {
          x: Math.min(maxPanX, Math.max(-maxPanX, nextX)),
          y: Math.min(maxPanY, Math.max(-maxPanY, nextY)),
        },
      }));
    }
  };

  const endCompareDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
    setIsPanning(false);
  };

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label-13 text-gray-900">
            {job.inputFormat.toUpperCase()}
          </p>
          <h2 className="truncate text-heading-16 text-gray-1000">
            {job.name}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            disabled={!job.result}
            size="icon-sm"
            title="Download Image"
            type="button"
            variant="ghost"
            onClick={() => onDownload(job)}
          >
            <Download aria-hidden="true" />
          </Button>
          <Button
            size="icon-sm"
            title="Remove this image"
            type="button"
            variant="ghost"
            onClick={() => onRemove(job)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div
        ref={compareRef}
        className={cn(
          "relative flex min-h-[50vh] touch-none items-center justify-center overflow-hidden rounded-[6px] bg-gray-100 select-none lg:min-h-0 lg:flex-1",
          job.result && transform.zoom > 1 && isPanning && "cursor-grabbing",
          job.result && transform.zoom > 1 && !isPanning && "cursor-grab",
          job.result && transform.zoom <= 1 && "cursor-ew-resize"
        )}
        onPointerCancel={endCompareDrag}
        onPointerDown={onComparePointerDown}
        onPointerMove={onComparePointerMove}
        onPointerUp={endCompareDrag}
      >
        <Image
          alt={`Original ${job.name}`}
          className={cn(
            "max-h-full max-w-full object-contain",
            !isPanning &&
              !isDragging &&
              "transition-transform duration-300 ease-out"
          )}
          draggable={false}
          height={job.height}
          src={job.originalUrl}
          style={{
            transform: `translate(${transform.pan.x}px, ${transform.pan.y}px) scale(${transform.zoom})`,
            transformOrigin: "center",
          }}
          unoptimized
          width={job.width}
        />
        {job.result ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ clipPath: `inset(0 ${100 - job.slider}% 0 0)` }}
            >
              <Image
                alt={`Optimized ${job.name}`}
                className={cn(
                  "max-h-full max-w-full object-contain",
                  !isPanning &&
                    !isDragging &&
                    "transition-transform duration-300 ease-out"
                )}
                draggable={false}
                height={job.result.height}
                src={job.result.url}
                style={{
                  transform: `translate(${transform.pan.x}px, ${transform.pan.y}px) scale(${transform.zoom})`,
                  transformOrigin: "center",
                }}
                unoptimized
                width={job.result.width}
              />
            </div>

            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 z-10 w-px -translate-x-1/2 bg-background-100 ring-1",
                isDragging
                  ? "ring-blue-600 shadow-[0_0_8px_rgba(0,112,243,0.3)]"
                  : "ring-gray-alpha-400"
              )}
              style={{ left: `${job.slider}%` }}
            />

            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-1/2 z-20 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background-100 shadow-sm transition-[transform,border-color,box-shadow] duration-150 ease-out",
                isDragging
                  ? "scale-110 border-blue-600 text-blue-600 shadow-[0_0_12px_rgba(0,112,243,0.2)]"
                  : "border-gray-alpha-400 text-gray-1000 hover:scale-105 hover:border-gray-alpha-500"
              )}
              style={{ left: `${job.slider}%` }}
            >
              <ChevronsLeftRight className="size-4" strokeWidth={2} />
            </div>

            <span className="pointer-events-none absolute top-3 left-3 z-20 hidden rounded-[6px] border border-gray-alpha-400 bg-background-100 px-2 py-1 text-label-12 text-gray-1000 shadow-xs sm:inline">
              Original
            </span>
            <span className="pointer-events-none absolute top-3 right-3 z-20 hidden rounded-[6px] border border-gray-alpha-400 bg-background-100 px-2 py-1 text-label-12 text-gray-1000 shadow-xs sm:inline">
              Optimized
            </span>

            {/* Zoom Control Panel */}
            <ZoomControls zoom={transform.zoom} setTransform={setTransform} />
          </>
        ) : null}

        {isJobPending(job) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-alpha-100 z-20">
            <Spinner
              aria-label="Processing"
              className="size-[22px] text-gray-900"
            />
            <span className="text-label-14 text-gray-900">Processing…</span>
          </div>
        ) : null}

        {job.status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100/90 px-4">
            <span className="text-center text-copy-14 text-red-800">
              {job.error ?? "Compression failed"}
            </span>
          </div>
        ) : null}
      </div>

      {job.result ? (
        <div className="flex shrink-0 flex-col gap-3 rounded-[6px] border border-gray-alpha-400 bg-background-100 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-label-13 text-gray-900">Original</span>
            <span className="text-label-13-mono text-gray-1000">
              {job.slider}%
            </span>
            <span className="text-label-13 text-gray-900">Optimized</span>
          </div>
          <input
            aria-label="Before and after comparison"
            className="compare-range w-full py-3 lg:py-0"
            max="100"
            min="0"
            step="1"
            type="range"
            value={job.slider}
            onChange={(event) =>
              onSliderChange(job, Number(event.target.value))
            }
          />
        </div>
      ) : null}
    </div>
  );
};
