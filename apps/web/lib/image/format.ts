import type { ImageFormat, OutputChoice } from "./types";

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || Number.isInteger(value) ? 0 : 1)} ${units[exponent]}`;
};

export const formatSavings = (originalSize: number, compressedSize: number) => {
  if (originalSize <= 0 || compressedSize <= 0) {
    return "0.0%";
  }

  const delta = ((originalSize - compressedSize) / originalSize) * 100;
  const sign = delta >= 0 ? "-" : "+";
  return `${sign}${Math.abs(delta).toFixed(1)}%`;
};

export const formatFromMime = (type: string): ImageFormat | null => {
  if (type === "image/jpeg") {
    return "jpeg";
  }
  if (type === "image/png") {
    return "png";
  }
  if (type === "image/webp") {
    return "webp";
  }
  return null;
};

export const mimeFromFormat = (format: ImageFormat) => {
  if (format === "jpeg") {
    return "image/jpeg";
  }
  if (format === "png") {
    return "image/png";
  }
  return "image/webp";
};

export const extensionForFormat = (format: ImageFormat) =>
  format === "jpeg" ? "jpg" : format;

export const resolveOutputFormat = (
  inputFormat: ImageFormat,
  outputChoice: OutputChoice
): ImageFormat => (outputChoice === "same" ? inputFormat : outputChoice);

export const shouldUseBrowserEncoder = (
  inputFormat: ImageFormat,
  outputChoice: OutputChoice
) => resolveOutputFormat(inputFormat, outputChoice) === "webp";

export type ApiOutputFormat = "same" | "jpeg" | "png";

export const apiOutputFormat = (
  inputFormat: ImageFormat,
  outputChoice: OutputChoice
): ApiOutputFormat => {
  if (shouldUseBrowserEncoder(inputFormat, outputChoice)) {
    throw new Error("WebP output is encoded in the browser.");
  }

  if (outputChoice === "jpeg" || outputChoice === "png") {
    return outputChoice;
  }

  return "same";
};

export const buildDownloadName = (
  filename: string,
  outputFormat: ImageFormat
) => {
  const basename = filename.replace(/\.[^/.]+$/u, "");
  return `${basename}-pigo.${extensionForFormat(outputFormat)}`;
};
