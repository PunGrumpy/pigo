"use client";

import { Spinner } from "@vercel/geistdocs/components/spinner";

import { formatSavings } from "@/lib/image/format";
import type { ImageJob } from "@/lib/image/types";
import { cn } from "@/lib/utils";

interface OptimizerStatusBadgeProps {
  job: ImageJob;
}

export const OptimizerStatusBadge = ({ job }: OptimizerStatusBadgeProps) => {
  switch (job.status) {
    case "queued":
    case "processing": {
      return (
        <span className="flex items-center gap-1.5">
          <Spinner aria-label="Processing" className="size-3 shrink-0" />
        </span>
      );
    }
    case "error": {
      return (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] bg-red-100 border border-red-400 px-1.5 py-0.5 text-[11px] font-semibold text-red-900">
          <span className="size-1 rounded-full bg-red-700" />
          Error
        </span>
      );
    }
    case "done": {
      if (!job.result) {
        return (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] bg-gray-100 border border-gray-400 px-1.5 py-0.5 text-[11px] font-semibold text-gray-900">
            Ready
          </span>
        );
      }

      const saved = job.result.size <= job.originalSize;
      return (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border px-1.5 py-0.5 text-[11px] font-mono font-semibold",
            saved
              ? "bg-green-100 border-green-400 text-green-900"
              : "bg-amber-100 border-amber-400 text-amber-900"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              saved ? "bg-green-700" : "bg-amber-700"
            )}
          />
          {formatSavings(job.originalSize, job.result.size)}
        </span>
      );
    }
    default: {
      const _exhaustive: never = job.status;
      return _exhaustive;
    }
  }
};
