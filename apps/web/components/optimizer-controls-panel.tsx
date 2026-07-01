"use client";

import { Button } from "@vercel/geistdocs/components/button";
import { Input } from "@vercel/geistdocs/components/input";
import {
  Download,
  ChevronDown,
  FileArchive,
  RefreshCw,
  Info,
} from "lucide-react";

import { OptimizerMetadataGrid } from "@/components/optimizer-metadata-grid";
import { useOptimizerContext } from "@/components/providers/optimizer-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBytes, formatSavings } from "@/lib/image/format";
import type { CompressionOptions, OutputChoice } from "@/lib/image/types";
import { cn } from "@/lib/utils";

export const OptimizerControlsPanel = () => {
  const {
    completedJobs,
    isProcessing,
    jobs,
    options,
    optionsDirty,
    selectedJob,
    totalCompressed,
    totalOriginal,
    applyOptions,
    downloadAll,
    patchOptions,
  } = useOptimizerContext();

  const completedCount = completedJobs.length;
  const jobCount = jobs.length;
  let applyLabel = "Recompress";
  if (isProcessing) {
    applyLabel = "Compressing…";
  } else if (optionsDirty) {
    applyLabel = "Apply Settings";
  }

  const saved = totalCompressed <= totalOriginal;
  const multipleDownloads = completedCount > 1;

  return (
    <aside
      aria-label="Settings and Information"
      className="flex w-full flex-col border-t border-gray-alpha-400 bg-background-200 lg:h-full lg:w-80 lg:shrink-0 lg:border-t-0 lg:border-l"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-alpha-400 px-4">
        <span className="text-label-13 font-semibold text-gray-1000">
          Configuration & Stats
        </span>
      </div>

      <div className="p-4 flex flex-col gap-6 lg:flex-1 lg:overflow-y-auto">
        <div className="flex flex-col gap-2">
          <h3 className="text-label-13 font-medium text-gray-900">
            Total Savings
          </h3>
          {completedCount === 0 ? (
            <div className="rounded-[6px] border border-gray-alpha-300 bg-background-100 p-3 text-center text-label-13 text-gray-900">
              Upload images to view savings stats.
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-[6px] border border-gray-alpha-300 bg-background-100 px-3 py-2.5 shadow-2xs">
              <span className="text-label-12 text-gray-800 font-medium">
                Aggregate Savings
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-label-14-mono text-gray-1000">
                <span>{formatBytes(totalOriginal)}</span>
                <span aria-hidden="true" className="text-gray-700">
                  to
                </span>
                <strong>{formatBytes(totalCompressed)}</strong>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-gray-alpha-300 pt-1.5">
                <span className="text-label-12 text-gray-800">Total Saved</span>
                <strong
                  className={cn(
                    "text-label-13-mono font-semibold",
                    saved ? "text-green-700" : "text-amber-700"
                  )}
                >
                  {formatSavings(totalOriginal, totalCompressed)}
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-label-13 font-medium text-gray-900">
            Compression Settings
          </h3>

          <label className="flex flex-col gap-1.5" htmlFor="output-format">
            <span className="text-label-12 text-gray-800">Output Format</span>
            <div className="relative">
              <select
                className={cn(
                  "peer h-9 w-full min-w-0 cursor-pointer appearance-none truncate rounded-md border-none bg-background-100 px-3 pr-9 text-label-14 text-gray-1000 shadow-[0_0_0_1px_var(--ds-gray-alpha-400)] outline-none transition-[box-shadow,color] duration-200",
                  "hover:shadow-[0_0_0_1px_var(--ds-gray-alpha-500)]",
                  "focus:outline-none focus-visible:shadow-[0_0_0_1px_var(--ds-gray-600),0_0_0_3px_color-mix(in_oklch,var(--ds-gray-600)_50%,transparent)]",
                  "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700 disabled:shadow-[0_0_0_1px_var(--ds-gray-alpha-400)]"
                )}
                id="output-format"
                value={options.outputFormat}
                onChange={(event) =>
                  patchOptions({
                    outputFormat: event.target.value as OutputChoice,
                  })
                }
              >
                <option value="same">Same</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-700"
              />
            </div>
          </label>

          <label
            aria-label="Quality"
            className="flex flex-col gap-1.5"
            htmlFor="quality"
          >
            <div className="flex justify-between items-center text-label-12 text-gray-800">
              <span>Quality</span>
              <span className="font-mono font-medium text-gray-1000 bg-gray-200 px-1.5 py-0.5 rounded">
                {options.quality}%
              </span>
            </div>
            <input
              className="compare-range w-full py-2"
              id="quality"
              max="100"
              min="1"
              type="range"
              value={options.quality}
              onChange={(event) =>
                patchOptions({ quality: Number(event.target.value) })
              }
            />
          </label>

          <div className="flex flex-col gap-3 rounded-[6px] border border-gray-alpha-300 bg-background-200/50 p-3">
            <Checkbox
              checked={options.resizeEnabled}
              id="resize-enabled"
              label="Resize Image"
              onChange={(event) => {
                const enabled = event.target.checked;
                const patch: Partial<CompressionOptions> = {
                  resizeEnabled: enabled,
                };
                if (enabled && selectedJob) {
                  patch.resizeWidth = selectedJob.width;
                  patch.resizeHeight = selectedJob.height;
                }
                patchOptions(patch);
              }}
            />

            {options.resizeEnabled && (
              <div className="mt-2 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1" htmlFor="resize-width">
                    <span className="text-[11px] text-gray-800">
                      Width (px)
                    </span>
                    <Input
                      id="resize-width"
                      max="16384"
                      min="1"
                      type="number"
                      value={options.resizeWidth || ""}
                      onChange={(event) =>
                        patchOptions({
                          resizeWidth: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label
                    className="flex flex-col gap-1"
                    htmlFor="resize-height"
                  >
                    <span className="text-[11px] text-gray-800">
                      Height (px)
                    </span>
                    <Input
                      id="resize-height"
                      max="16384"
                      min="1"
                      type="number"
                      value={options.resizeHeight || ""}
                      onChange={(event) =>
                        patchOptions({
                          resizeHeight: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </label>
                </div>
                <Checkbox
                  checked={options.maintainAspect}
                  id="maintain-aspect"
                  label="Maintain Aspect Ratio"
                  onChange={(event) =>
                    patchOptions({ maintainAspect: event.target.checked })
                  }
                />
              </div>
            )}
          </div>
        </div>

        {selectedJob && (
          <div className="flex flex-col gap-3 border-t border-gray-alpha-300 pt-5">
            <div className="flex items-center gap-1.5 text-label-13 font-medium text-gray-900">
              <Info className="size-4 text-gray-700" />
              <span>Image Metadata</span>
            </div>
            <div className="rounded-[6px] border border-gray-alpha-300 bg-background-100 p-1">
              <OptimizerMetadataGrid job={selectedJob} />
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-gray-alpha-400 p-4 bg-background-200">
        <Button
          disabled={
            jobCount === 0 ||
            isProcessing ||
            (!optionsDirty && completedCount > 0)
          }
          type="button"
          variant="ghost"
          onClick={applyOptions}
          className="w-full flex items-center justify-center gap-2"
        >
          <RefreshCw
            aria-hidden="true"
            className={cn("size-4", isProcessing && "animate-spin")}
          />
          {applyLabel}
        </Button>
        <Button
          disabled={completedCount === 0}
          type="button"
          onClick={downloadAll}
          className="w-full flex items-center justify-center gap-2"
        >
          {multipleDownloads ? (
            <FileArchive aria-hidden="true" className="size-4" />
          ) : (
            <Download aria-hidden="true" className="size-4" />
          )}
          {multipleDownloads ? "Download ZIP Archive" : "Download Image"}
        </Button>
      </div>
    </aside>
  );
};
