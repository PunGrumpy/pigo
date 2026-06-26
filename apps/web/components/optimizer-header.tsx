import { Button } from "@vercel/geistdocs/components/button";
import { Trash2, Upload } from "lucide-react";

interface OptimizerHeaderProps {
  jobCount: number;
  onClear: () => void;
  onSelectFiles: () => void;
}

export const OptimizerHeader = ({
  jobCount,
  onClear,
  onSelectFiles,
}: OptimizerHeaderProps) => (
  <header className="flex shrink-0 flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-[6px] bg-gray-1000 text-background-100 text-heading-16">
        P
      </span>
      <div>
        <h1 className="text-heading-20 text-gray-1000">Pigo</h1>
        <p className="text-label-13 text-gray-900">
          JPEG, PNG, and browser WebP optimization
        </p>
      </div>
    </div>
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <Button
        className="w-full sm:w-auto"
        type="button"
        onClick={onSelectFiles}
      >
        <Upload aria-hidden="true" />
        Select Files
      </Button>
      <Button
        className="w-full sm:w-auto"
        type="button"
        variant="ghost"
        disabled={jobCount === 0}
        onClick={onClear}
      >
        <Trash2 aria-hidden="true" />
        Clear All
      </Button>
    </div>
  </header>
);
