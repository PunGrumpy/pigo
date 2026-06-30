"use client";

import { Button } from "@vercel/geistdocs/components/button";
import { Input } from "@vercel/geistdocs/components/input";
import { Download, ChevronDown, FileArchive, RefreshCw } from "lucide-react";

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
  const onApply = applyOptions;
  const onDownloadAll = downloadAll;
  const onPatchOptions = patchOptions;
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
      aria-label="Compression settings"
      className="order-3 flex shrink-0 flex-col gap-4 rounded-[6px] border border-gray-alpha-400 bg-background-100 p-4 shadow-xs md:p-6 lg:order-0 lg:h-full lg:min-h-0 lg:shrink"
    >
      <div>
        <p className="text-label-13 text-gray-900">Settings</p>
        <h2 className="text-heading-16 text-gray-1000">Compression</h2>
      </div>

      {completedCount === 0 ? (
        <p className="text-label-14 text-gray-900">Waiting for images</p>
      ) : (
        <div className="flex flex-col gap-1 rounded-[6px] bg-gray-100 px-3 py-2">
          <span className="text-label-13 text-gray-900">Total savings</span>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-label-14-mono text-gray-1000">
            <span>{formatBytes(totalOriginal)}</span>
            <span aria-hidden="true" className="text-gray-700">
              to
            </span>
            <strong>{formatBytes(totalCompressed)}</strong>
            <strong className={cn(saved ? "text-green-700" : "text-amber-700")}>
              {formatSavings(totalOriginal, totalCompressed)}
            </strong>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-1.5 lg:-m-1.5">
        <label className="flex flex-col gap-1.5" htmlFor="output-format">
          <span className="text-label-13 text-gray-900">Output</span>
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
                onPatchOptions({
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

        <label className="flex flex-col gap-1.5" htmlFor="quality">
          <span className="text-label-13 text-gray-900">
            Quality ({options.quality})
          </span>
          <input
            className="compare-range w-full py-3 lg:py-0"
            id="quality"
            max="100"
            min="1"
            type="range"
            value={options.quality}
            onChange={(event) =>
              onPatchOptions({ quality: Number(event.target.value) })
            }
          />
        </label>

        <Checkbox
          checked={options.resizeEnabled}
          id="resize-enabled"
          label="Resize"
          onChange={(event) => {
            const enabled = event.target.checked;
            const patch: Partial<CompressionOptions> = {
              resizeEnabled: enabled,
            };
            if (enabled && selectedJob) {
              patch.resizeWidth = selectedJob.width;
              patch.resizeHeight = selectedJob.height;
            }
            onPatchOptions(patch);
          }}
        />

        {options.resizeEnabled ? (
          <>
            <label className="flex flex-col gap-1.5" htmlFor="resize-width">
              <span className="text-label-13 text-gray-900">Width</span>
              <Input
                id="resize-width"
                max="16384"
                min="1"
                type="number"
                value={options.resizeWidth || ""}
                onChange={(event) =>
                  onPatchOptions({
                    resizeWidth: Number(event.target.value) || 0,
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1.5" htmlFor="resize-height">
              <span className="text-label-13 text-gray-900">Height</span>
              <Input
                id="resize-height"
                max="16384"
                min="1"
                type="number"
                value={options.resizeHeight || ""}
                onChange={(event) =>
                  onPatchOptions({
                    resizeHeight: Number(event.target.value) || 0,
                  })
                }
              />
            </label>
            <Checkbox
              checked={options.maintainAspect}
              id="maintain-aspect"
              label="Keep aspect"
              onChange={(event) =>
                onPatchOptions({ maintainAspect: event.target.checked })
              }
            />
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-gray-alpha-400 border-t pt-4">
        <Button
          disabled={
            jobCount === 0 ||
            isProcessing ||
            (!optionsDirty && completedCount > 0)
          }
          type="button"
          variant="ghost"
          onClick={onApply}
        >
          <RefreshCw aria-hidden="true" />
          {applyLabel}
        </Button>
        <Button
          disabled={completedCount === 0}
          type="button"
          onClick={onDownloadAll}
        >
          {multipleDownloads ? (
            <FileArchive aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {multipleDownloads ? (
            <>
              <span className="sm:hidden">Download ZIP</span>
              <span className="hidden sm:inline">Download ZIP Archive</span>
            </>
          ) : (
            "Download Image"
          )}
        </Button>
      </div>
    </aside>
  );
};
