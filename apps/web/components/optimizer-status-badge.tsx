import { Spinner } from "@vercel/geistdocs/components/spinner";

import { formatSavings } from "@/lib/image/format";
import type { ImageJob } from "@/lib/image/types";
import { cn } from "@/lib/utils";

interface OptimizerStatusBadgeProps {
  job: ImageJob;
}

export const OptimizerStatusBadge = ({ job }: OptimizerStatusBadgeProps) => {
  switch (job.status) {
    case "queued":
    case "processing": {
      return <Spinner aria-label="Processing" className="size-4 shrink-0" />;
    }
    case "error": {
      return (
        <span className="shrink-0 whitespace-nowrap rounded-md bg-red-100 px-2 py-0.5 text-label-12 text-red-800">
          Error
        </span>
      );
    }
    case "done": {
      if (!job.result) {
        return (
          <span className="shrink-0 whitespace-nowrap rounded-md bg-gray-100 px-2 py-0.5 text-label-12 text-gray-900">
            Ready
          </span>
        );
      }

      const saved = job.result.size <= job.originalSize;
      return (
        <span
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-label-12-mono",
            saved
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-900"
          )}
        >
          {formatSavings(job.originalSize, job.result.size)}
        </span>
      );
    }
    default: {
      const _exhaustive: never = job.status;
      return _exhaustive;
    }
  }
};
