import type { CompressionHeaders, ImageFormat } from "./types";

const numberHeader = (headers: Headers, name: string) => {
  const value = Number(headers.get(name));
  return Number.isFinite(value) ? value : 0;
};

const imageFormatHeader = (headers: Headers, name: string): ImageFormat => {
  const value = headers.get(name);
  if (value === "jpeg" || value === "png" || value === "webp") {
    return value;
  }
  return "jpeg";
};

export const parseCompressionHeaders = (
  headers: Headers
): CompressionHeaders => ({
  compressedSize: numberHeader(headers, "X-Compressed-Size"),
  elapsedMs: numberHeader(headers, "X-Elapsed-Ms"),
  height: numberHeader(headers, "X-Height"),
  originalSize: numberHeader(headers, "X-Original-Size"),
  outputFormat: imageFormatHeader(headers, "X-Output-Format"),
  width: numberHeader(headers, "X-Width"),
});
