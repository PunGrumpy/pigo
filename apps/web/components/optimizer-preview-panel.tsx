"use client";

import { ImageIcon } from "lucide-react";

import { OptimizerPreview } from "@/components/optimizer-preview";
import { useDragDrop } from "@/components/providers/drag-drop-provider";
import { useOptimizerContext } from "@/components/providers/optimizer-provider";
import { cn } from "@/lib/utils";

export const OptimizerPreviewPanel = () => {
  const { dropActive } = useDragDrop();
  const { selectedJob, downloadJob, removeJob, updateJob } =
    useOptimizerContext();

  return (
    <section
      aria-label="Image preview"
      className="order-1 flex flex-col gap-4 rounded-[12px] border border-gray-alpha-400 bg-background-100 p-4 shadow-sm md:p-6 lg:order-0 lg:h-full lg:min-h-0 lg:flex-1"
    >
      {selectedJob ? (
        <OptimizerPreview
          job={selectedJob}
          onDownload={downloadJob}
          onRemove={(job) => removeJob(job.id)}
          onSliderChange={(job, value) =>
            updateJob(job.id, (current) => ({ ...current, slider: value }))
          }
        />
      ) : (
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed border-gray-alpha-400 text-center",
            dropActive && "border-blue-700 bg-blue-100"
          )}
        >
          <ImageIcon
            aria-hidden="true"
            className="text-gray-700"
            size={48}
            strokeWidth={1.5}
          />
          <p className="text-copy-14 text-gray-900">
            Drop or select images to start compressing.
          </p>
        </div>
      )}
    </section>
  );
};
