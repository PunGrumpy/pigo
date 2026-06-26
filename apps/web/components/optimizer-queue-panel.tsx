import { Loader2, PanelLeft } from "lucide-react";

import { OptimizerDropZone } from "@/components/optimizer-drop-zone";
import { OptimizerQueueItem } from "@/components/optimizer-queue-item";
import type { ImageJob } from "@/lib/image/types";

interface OptimizerQueuePanelProps {
  dropActive: boolean;
  isProcessing: boolean;
  jobs: ImageJob[];
  notice: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectFiles: () => void;
}

const formatFileCount = (count: number) => {
  if (count === 0) {
    return "No files";
  }
  if (count === 1) {
    return "1 file";
  }
  return `${count} files`;
};

export const OptimizerQueuePanel = ({
  dropActive,
  isProcessing,
  jobs,
  notice,
  selectedId,
  onSelect,
  onSelectFiles,
}: OptimizerQueuePanelProps) => (
  <aside
    aria-label="Image queue"
    className="order-2 flex shrink-0 flex-col gap-4 rounded-[6px] border border-gray-alpha-400 bg-background-100 p-4 shadow-xs md:p-6 lg:order-0 lg:h-full lg:min-h-0 lg:shrink"
  >
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-label-13 text-gray-900">Queue</p>
        <h2 className="text-heading-16 text-gray-1000">
          {formatFileCount(jobs.length)}
        </h2>
      </div>
      {isProcessing ? (
        <Loader2
          aria-hidden="true"
          className="size-[18px] animate-spin text-gray-700"
        />
      ) : (
        <PanelLeft aria-hidden="true" className="size-[18px] text-gray-700" />
      )}
    </div>

    {jobs.length === 0 ? (
      <div className="min-h-[12rem] lg:min-h-0 lg:flex-1">
        <OptimizerDropZone active={dropActive} onClick={onSelectFiles} />
      </div>
    ) : (
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="flex flex-col gap-1">
          {jobs.map((job) => (
            <OptimizerQueueItem
              job={job}
              key={job.id}
              selected={selectedId === job.id}
              onSelect={() => onSelect(job.id)}
            />
          ))}
        </div>
      </div>
    )}

    {notice ? (
      <output className="block rounded-[6px] bg-amber-100 px-3 py-2 text-copy-13 text-amber-1000">
        {notice}
      </output>
    ) : null}
  </aside>
);
