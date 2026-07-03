"use client";

import type { ExifData } from "@/lib/image/exif";
import { formatBytes, formatSavings } from "@/lib/image/format";
import type { ImageJob } from "@/lib/image/types";
import { cn } from "@/lib/utils";

interface OptimizerMetadataGridProps {
  job: ImageJob;
}

interface ExifSectionProps {
  exif: ExifData;
}

const ExifSection = ({ exif }: ExifSectionProps) => (
  <>
    <div className="px-3 py-1.5 bg-gray-200/60 text-[10px] font-bold text-gray-800 uppercase tracking-wider">
      Camera & EXIF Data
    </div>
    {exif.make && (
      <div className="flex justify-between items-center px-3 py-2">
        <span className="text-gray-900">Camera Maker</span>
        <span
          className="font-mono font-medium text-gray-1000 truncate max-w-[12rem] text-right"
          title={exif.make}
        >
          {exif.make}
        </span>
      </div>
    )}
    {exif.model && (
      <div className="flex justify-between items-center px-3 py-2">
        <span className="text-gray-900">Camera Model</span>
        <span
          className="font-mono font-medium text-gray-1000 truncate max-w-[12rem] text-right"
          title={exif.model}
        >
          {exif.model}
        </span>
      </div>
    )}
    {exif.exposureTime && (
      <div className="flex justify-between items-center px-3 py-2">
        <span className="text-gray-900">Exposure</span>
        <span className="font-mono font-medium text-gray-1000 text-right">
          {exif.exposureTime}
        </span>
      </div>
    )}
    {exif.fNumber && (
      <div className="flex justify-between items-center px-3 py-2">
        <span className="text-gray-900">Aperture</span>
        <span className="font-mono font-medium text-gray-1000 text-right">
          {exif.fNumber}
        </span>
      </div>
    )}
    {exif.iso && (
      <div className="flex justify-between items-center px-3 py-2">
        <span className="text-gray-900">ISO Speed</span>
        <span className="font-mono font-medium text-gray-1000 text-right">
          {exif.iso}
        </span>
      </div>
    )}
    {exif.focalLength && (
      <div className="flex justify-between items-center px-3 py-2">
        <span className="text-gray-900">Focal Length</span>
        <span className="font-mono font-medium text-gray-1000 text-right">
          {exif.focalLength}
        </span>
      </div>
    )}
    {exif.software && (
      <div className="flex justify-between items-center px-3 py-2">
        <span className="text-gray-900">Software</span>
        <span
          className="font-mono font-medium text-gray-1000 truncate max-w-[12rem] text-right"
          title={exif.software}
        >
          {exif.software}
        </span>
      </div>
    )}
    {exif.dateTime && (
      <div className="flex justify-between items-center px-3 py-2">
        <span className="text-gray-900">Date Taken</span>
        <span
          className="font-mono font-medium text-gray-1000 truncate max-w-[12rem] text-right"
          title={exif.dateTime}
        >
          {exif.dateTime}
        </span>
      </div>
    )}
  </>
);

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
      <span
        className={cn(
          "font-mono",
          !job.result && "text-gray-1000",
          job.result &&
            job.result.size <= job.originalSize &&
            "text-green-700 font-semibold",
          job.result &&
            job.result.size > job.originalSize &&
            "text-amber-700 font-semibold"
        )}
      >
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

    {/* EXIF Data */}
    {job.exif && Object.keys(job.exif).length > 0 && (
      <ExifSection exif={job.exif} />
    )}

    {/* Metadata stripping warning */}
    {job.result && (
      <div className="px-3 py-2.5 bg-amber-100/20 text-[11px] text-amber-1000 font-medium leading-relaxed">
        EXIF metadata has been stripped from the output image for maximum size
        savings and privacy.
      </div>
    )}
  </div>
);
