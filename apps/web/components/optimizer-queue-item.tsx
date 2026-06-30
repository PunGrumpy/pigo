"use client";

import Image from "next/image";

import { OptimizerStatusBadge } from "@/components/optimizer-status-badge";
import { formatBytes } from "@/lib/image/format";
import type { ImageJob } from "@/lib/image/types";
import { cn } from "@/lib/utils";

interface OptimizerQueueItemProps {
  job: ImageJob;
  selected: boolean;
  onSelect: () => void;
}

export const OptimizerQueueItem = ({
  job,
  selected,
  onSelect,
}: OptimizerQueueItemProps) => (
  <button
    className={cn(
      "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition-colors duration-150 outline-none",
      "hover:bg-gray-200 active:bg-gray-300",
      selected &&
        "bg-gray-200 text-gray-1000 font-semibold border border-gray-alpha-400"
    )}
    type="button"
    onClick={onSelect}
  >
    <div className="relative size-8 shrink-0 overflow-hidden rounded-md border border-gray-alpha-300 bg-background-200">
      <Image
        alt=""
        className="size-full object-cover"
        height={32}
        src={job.originalUrl}
        unoptimized
        width={32}
      />
    </div>

    <span className="min-w-0 flex-1">
      <strong
        className={cn(
          "block truncate text-label-13 leading-tight",
          selected
            ? "text-gray-1000 font-semibold"
            : "text-gray-900 font-normal"
        )}
      >
        {job.name}
      </strong>
      <span className="mt-0.5 flex min-w-0 items-center justify-between gap-2 leading-none">
        <small className="min-w-0 truncate text-[11px] text-gray-800">
          {formatBytes(job.originalSize)}
        </small>
        <OptimizerStatusBadge job={job} />
      </span>
    </span>
  </button>
);
