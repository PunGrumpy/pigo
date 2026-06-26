import {
  ACCEPTED_MIME_TYPES,
  MAX_FILES,
  MAX_FILE_SIZE,
  MAX_PIXELS,
} from "./constants";
import { formatBytes } from "./format";
import type { AcceptedMimeType } from "./types";

export const validateFile = (file: File, existingCount: number) => {
  if (existingCount >= MAX_FILES) {
    return `Pigo accepts up to ${MAX_FILES} files at a time.`;
  }
  if (!ACCEPTED_MIME_TYPES.includes(file.type as AcceptedMimeType)) {
    return `${file.name} is not a JPEG, PNG, or WebP image.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name} is larger than ${formatBytes(MAX_FILE_SIZE)}.`;
  }

  return null;
};

export const validateDimensions = (
  width: number,
  height: number,
  filename: string
) => {
  if (width <= 0 || height <= 0) {
    return `${filename} has invalid dimensions.`;
  }
  if (width * height > MAX_PIXELS) {
    return `${filename} exceeds the 100MP pixel limit.`;
  }
  return null;
};
