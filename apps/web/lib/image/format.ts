import type { ImageFormat, InputFormat, OutputChoice } from "./types";

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

const INPUT_FORMAT_BY_MIME: Record<string, InputFormat> = {
  "image/heic": "heic",
  "image/heif": "heic",
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

const HEIC_EXTENSION = /\.(?:heic|heif)$/iu;

export const formatFromMime = (type: string): InputFormat | null =>
  INPUT_FORMAT_BY_MIME[type] ?? null;

export const inputFormatOf = (file: File): InputFormat | null => {
  const fromMime = formatFromMime(file.type);
  if (fromMime) {
    return fromMime;
  }
  return HEIC_EXTENSION.test(file.name) ? "heic" : null;
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

const extensionForFormat = (format: ImageFormat) =>
  format === "jpeg" ? "jpg" : format;

export const resolveOutputFormat = (
  inputFormat: InputFormat,
  outputChoice: OutputChoice
): ImageFormat => {
  if (outputChoice !== "same") {
    return outputChoice;
  }
  return inputFormat === "heic" ? "jpeg" : inputFormat;
};

export const shouldUseBrowserEncoder = (
  inputFormat: InputFormat,
  outputChoice: OutputChoice
) =>
  inputFormat === "heic" ||
  resolveOutputFormat(inputFormat, outputChoice) === "webp";

export type ApiOutputFormat = "same" | "jpeg" | "png";

export const apiOutputFormat = (
  inputFormat: InputFormat,
  outputChoice: OutputChoice
): ApiOutputFormat => {
  if (shouldUseBrowserEncoder(inputFormat, outputChoice)) {
    throw new Error("HEIC input and WebP output are encoded in the browser.");
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
