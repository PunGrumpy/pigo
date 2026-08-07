"use client";

import Image from "next/image";

import { OptimizerStatusBadge } from "@/components/optimizer-status-badge";
import { useOptimizerContext } from "@/components/providers/optimizer-provider";
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
}: OptimizerQueueItemProps) => {
  const { options } = useOptimizerContext();
  const targetFormat =
    options.outputFormat === "same" ? job.inputFormat : options.outputFormat;
  const isConverted = job.inputFormat !== targetFormat;

  return (
    <button
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[6px] border border-transparent px-2.5 py-2 text-left transition-colors duration-150 outline-none",
        "hover:bg-gray-200 active:bg-gray-300",
        selected && "bg-gray-200 text-gray-1000 border-gray-alpha-400"
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
            "block truncate text-label-13 font-medium leading-tight",
            selected ? "text-gray-1000" : "text-gray-900"
          )}
        >
          {job.name}
        </strong>
        <span className="mt-0.5 flex min-w-0 items-center justify-between gap-2 leading-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <small className="shrink-0 text-[11px] text-gray-800">
              {formatBytes(job.originalSize)}
            </small>
            <span className="text-[9px] font-mono font-semibold uppercase px-1 py-0.5 rounded bg-gray-300 text-gray-700 truncate">
              {isConverted
                ? `${job.inputFormat} → ${targetFormat}`
                : job.inputFormat}
            </span>
          </div>
          <OptimizerStatusBadge job={job} />
        </span>
      </span>
    </button>
  );
};
