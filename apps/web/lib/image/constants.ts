import type { CompressionOptions, OutputChoice } from "./types";

export const MAX_FILES = 10;
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_PIXELS = 100_000_000;
export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const DEFAULT_COMPRESSION_OPTIONS = {
  maintainAspect: true,
  outputFormat: "same",
  quality: 82,
  resizeEnabled: false,
  resizeHeight: 0,
  resizeWidth: 0,
} as const;

const OUTPUT_CHOICES = new Set<OutputChoice>(["same", "jpeg", "png", "webp"]);

export const normalizeQuality = (quality: number) => {
  const rounded = Math.round(quality);
  if (!Number.isFinite(rounded)) {
    return DEFAULT_COMPRESSION_OPTIONS.quality;
  }
  return Math.min(100, Math.max(1, rounded));
};

export const sanitizeCompressionOptions = (
  options: CompressionOptions
): CompressionOptions => ({
  ...DEFAULT_COMPRESSION_OPTIONS,
  ...options,
  outputFormat: OUTPUT_CHOICES.has(options.outputFormat)
    ? options.outputFormat
    : DEFAULT_COMPRESSION_OPTIONS.outputFormat,
  quality: normalizeQuality(options.quality),
});
