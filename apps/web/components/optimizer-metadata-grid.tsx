"use client";

import { formatBytes, formatSavings } from "@/lib/image/format";
import type { ImageJob } from "@/lib/image/types";
import { cn } from "@/lib/utils";

interface OptimizerMetadataGridProps {
  job: ImageJob;
}

const savingsToneClass = (job: ImageJob): string => {
  if (!job.result) {
    return "text-gray-1000";
  }
  return job.result.size <= job.originalSize
    ? "text-green-700 font-semibold"
    : "text-amber-700 font-semibold";
};

export const OptimizerMetadataGrid = ({ job }: OptimizerMetadataGridProps) => (
  <div className="flex flex-col divide-y divide-gray-alpha-300 text-label-13">
    <div className="flex justify-between items-center px-3 py-2">
      <span className="text-gray-900">Original Size</span>
      <span className="font-mono font-medium text-gray-1000">
        {formatBytes(job.originalSize)}
      </span>
    </div>

    {/* Output Size */}
    <div className="flex justify-between items-center px-3 py-2">
      <span className="text-gray-900">Output Size</span>
      <span className="font-mono font-medium text-gray-1000">
        {job.result ? (
          `${formatBytes(job.result.size)} (${job.result.outputFormat.toUpperCase()})`
        ) : (
          <span className="inline-block h-4 w-16 bg-gray-300 rounded animate-pulse" />
        )}
      </span>
    </div>

    {/* Savings */}
    <div className="flex justify-between items-center px-3 py-2">
      <span className="text-gray-900">Savings</span>
      <span className={cn("font-mono", savingsToneClass(job))}>
        {job.result ? (
          formatSavings(job.originalSize, job.result.size)
        ) : (
          <span className="inline-block h-4 w-16 bg-gray-300 rounded animate-pulse" />
        )}
      </span>
    </div>

    {/* Dimensions */}
    <div className="flex justify-between items-center px-3 py-2">
      <span className="text-gray-900">Dimensions</span>
      <span className="font-mono font-medium text-gray-1000">
        {job.result
          ? `${job.width}×${job.height} → ${job.result.width}×${job.result.height}`
          : `${job.width}×${job.height}`}
      </span>
    </div>

    {/* Time Elapsed */}
    <div className="flex justify-between items-center px-3 py-2">
      <span className="text-gray-900">Time Elapsed</span>
      <span className="font-mono font-medium text-gray-1000">
        {job.result ? (
          `${job.result.elapsedMs}ms`
        ) : (
          <span className="inline-block h-4 w-16 bg-gray-300 rounded animate-pulse" />
        )}
      </span>
    </div>
  </div>
);
