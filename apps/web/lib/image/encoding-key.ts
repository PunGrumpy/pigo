import { targetDimensions } from "@/lib/compress/browser";
import { resolveOutputFormat } from "@/lib/image/format";
import type { CompressionOptions, ImageJob } from "@/lib/image/types";

/**
 * The definition of "same output": two option sets with equal keys encode to
 * the same image, so the second encode can be skipped. A new encoding option
 * must be added here, or changing it will do nothing.
 *
 * Quality is left out for PNG because lossless output ignores it.
 */
export const encodingKey = (
  job: Pick<ImageJob, "height" | "inputFormat" | "width">,
  options: CompressionOptions
): string => {
  const format = resolveOutputFormat(job.inputFormat, options.outputFormat);
  const { height, width } = targetDimensions(job.width, job.height, options);
  const quality = format === "png" ? "lossless" : options.quality;
  return `${format}|${width}x${height}|${quality}`;
};
