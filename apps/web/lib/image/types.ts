import type { ACCEPTED_MIME_TYPES } from "./constants";

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];
export type ImageFormat = "jpeg" | "png" | "webp";
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

export interface ImageResult {
  blob: Blob;
  url: string;
  size: number;
  elapsedMs: number;
  outputFormat: ImageFormat;
  width: number;
  height: number;
}

export interface ImageJob {
  id: string;
  file: File;
  name: string;
  inputFormat: ImageFormat;
  originalUrl: string;
  originalSize: number;
  width: number;
  height: number;
  status: JobStatus;
  slider: number;
  error?: string;
  result?: ImageResult;
}
