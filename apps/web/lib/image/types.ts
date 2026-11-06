import type { ExifData } from "./exif";

export type ImageFormat = "jpeg" | "png" | "webp";
export type InputFormat = ImageFormat | "heic";
export type OutputChoice = "same" | ImageFormat;
export type JobStatus = "queued" | "processing" | "done" | "error";

export interface CompressionOptions {
  outputFormat: OutputChoice;
  quality: number;
  resizeEnabled: boolean;
  resizeWidth: number;
  resizeHeight: number;
  maintainAspect: boolean;
}

export interface CompressionHeaders {
  originalSize: number;
  compressedSize: number;
  elapsedMs: number;
  outputFormat: ImageFormat;
  width: number;
  height: number;
}

// What an encoder produces. encodeJob stamps the settings key on top.
export interface EncodedImage {
  blob: Blob;
  url: string;
  size: number;
  elapsedMs: number;
  outputFormat: ImageFormat;
  width: number;
  height: number;
}

export interface ImageResult extends EncodedImage {
  // encodingKey of the options that produced this result.
  settingsKey: string;
}

export interface ImageJob {
  id: string;
  // The decodable source the pipeline reads; a JPEG decoded at ingest for HEIC.
  file: File;
  name: string;
  inputFormat: InputFormat;
  originalUrl: string;
  // Small standalone decode for the queue rows; null when encoding failed.
  thumbnailUrl: string | null;
  originalSize: number;
  width: number;
  height: number;
  status: JobStatus;
  slider: number;
  error?: string;
  result?: ImageResult;
  exif?: ExifData | null;
}
