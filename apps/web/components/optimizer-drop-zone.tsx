import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface OptimizerDropZoneProps {
  active: boolean;
  onClick: () => void;
}

export const OptimizerDropZone = ({
  active,
  onClick,
}: OptimizerDropZoneProps) => (
  <button
    className={cn(
      "flex h-full w-full flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed border-gray-alpha-400 px-4 py-10 text-center active:border-gray-alpha-600 active:bg-gray-200",
      "[@media(hover:hover)_and_(pointer:fine)]:hover:border-gray-alpha-500 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-gray-100",
      active && "border-blue-700 bg-blue-100"
    )}
    type="button"
    onClick={onClick}
  >
    <ImageIcon
      aria-hidden="true"
      className="text-gray-700"
      size={36}
      strokeWidth={1.5}
    />
    <span className="text-label-14 text-gray-1000">Drop images here</span>
    <span className="text-copy-13 text-gray-900">
      JPEG, PNG, or WebP. Paste also works.
    </span>
  </button>
);
