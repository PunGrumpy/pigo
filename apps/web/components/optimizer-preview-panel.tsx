import { ImageIcon } from "lucide-react";

import { OptimizerPreview } from "@/components/optimizer-preview";
import type { ImageJob } from "@/lib/image/types";
import { cn } from "@/lib/utils";

interface OptimizerPreviewPanelProps {
  dropActive: boolean;
  job: ImageJob | null;
  onDownload: (job: ImageJob) => void;
  onRemove: (job: ImageJob) => void;
  onSliderChange: (job: ImageJob, value: number) => void;
}

export const OptimizerPreviewPanel = ({
  dropActive,
  job,
  onDownload,
  onRemove,
  onSliderChange,
}: OptimizerPreviewPanelProps) => (
  <section
    aria-label="Image preview"
    className="order-1 flex flex-col gap-4 rounded-[12px] border border-gray-alpha-400 bg-background-100 p-4 shadow-sm md:p-6 lg:order-0 lg:h-full lg:min-h-0 lg:flex-1"
  >
    {job ? (
      <OptimizerPreview
        job={job}
        onDownload={onDownload}
        onRemove={onRemove}
        onSliderChange={onSliderChange}
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
