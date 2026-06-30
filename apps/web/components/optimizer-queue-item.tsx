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
      "flex w-full items-center gap-3 rounded-[6px] px-2 py-2 text-left active:bg-gray-300",
      "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-gray-200",
      selected &&
        "bg-gray-100 shadow-[inset_0_0_0_1px_var(--ds-gray-alpha-400)]"
    )}
    type="button"
    onClick={onSelect}
  >
    <Image
      alt=""
      className="size-10 shrink-0 rounded-md object-cover"
      height={40}
      src={job.originalUrl}
      unoptimized
      width={40}
    />
    <span className="min-w-0 flex-1">
      <strong className="block truncate text-label-14 text-gray-1000">
        {job.name}
      </strong>
      <span className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
        <small className="min-w-0 truncate text-label-13 text-gray-900">
          {job.width} x {job.height} · {formatBytes(job.originalSize)}
        </small>
        <OptimizerStatusBadge job={job} />
      </span>
    </span>
  </button>
);
