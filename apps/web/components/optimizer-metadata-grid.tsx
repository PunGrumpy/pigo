import { formatBytes, formatSavings } from "@/lib/image/format";
import type { ImageJob } from "@/lib/image/types";
import { cn } from "@/lib/utils";

interface OptimizerMetadataGridProps {
  job: ImageJob;
}

interface MetricProps {
  label: string;
  value: string;
  tone?: "good" | "warn";
}

const Metric = ({ label, value, tone }: MetricProps) => (
  <div className="flex flex-col gap-0.5 rounded-[6px] bg-gray-100 px-2.5 py-1.5">
    <span className="text-label-13 text-gray-900">{label}</span>
    <strong
      className={cn(
        "text-label-14-mono text-gray-1000",
        tone === "good" && "text-green-700",
        tone === "warn" && "text-amber-700"
      )}
    >
      {value}
    </strong>
  </div>
);

const savingsTone = (job: ImageJob): "good" | "warn" | undefined => {
  if (!job.result) {
    return undefined;
  }
  return job.result.size <= job.originalSize ? "good" : "warn";
};

export const OptimizerMetadataGrid = ({ job }: OptimizerMetadataGridProps) => (
  <div className="grid shrink-0 grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3">
    <Metric label="Original" value={formatBytes(job.originalSize)} />
    <Metric
      label="Output"
      value={
        job.result
          ? `${formatBytes(job.result.size)} ${job.result.outputFormat.toUpperCase()}`
          : "Pending"
      }
    />
    <Metric
      label="Savings"
      tone={savingsTone(job)}
      value={
        job.result
          ? formatSavings(job.originalSize, job.result.size)
          : "Pending"
      }
    />
    <Metric
      label="Dimensions"
      value={
        job.result
          ? `${job.width} x ${job.height} -> ${job.result.width} x ${job.result.height}`
          : `${job.width} x ${job.height}`
      }
    />
    <Metric
      label="Elapsed"
      value={job.result ? `${job.result.elapsedMs}ms` : "Pending"}
    />
  </div>
);
