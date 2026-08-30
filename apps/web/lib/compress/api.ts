import { env } from "@/env";
import { apiOutputFormat, mimeFromFormat } from "@/lib/image/format";
import { parseCompressionHeaders } from "@/lib/image/headers";
import type {
  CompressionHeaders,
  CompressionOptions,
  ImageJob,
  ImageResult,
} from "@/lib/image/types";

// Local dev uses Next.js rewrites (/api → Go API). On Vercel, set NEXT_PUBLIC_API_URL.
const apiBase =
  process.env.NODE_ENV === "development" && !process.env.VERCEL
    ? "/api"
    : env.NEXT_PUBLIC_API_URL;

const readApiError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Compression failed with ${response.status}`;
  } catch {
    return `Compression failed with ${response.status}`;
  }
};

const resultFromBlob = (
  blob: Blob,
  headers: CompressionHeaders
): ImageResult => {
  const { outputFormat } = headers;
  const outputBlob = blob.type
    ? blob
    : new Blob([blob], { type: mimeFromFormat(outputFormat) });

  return {
    blob: outputBlob,
    elapsedMs: headers.elapsedMs,
    height: headers.height,
    outputFormat,
    size: headers.compressedSize || blob.size,
    url: URL.createObjectURL(outputBlob),
    width: headers.width,
  };
};

// The server's write timeout is 90s (apps/api/main.go); 120s means the client
// only gives up after the server certainly has.
const API_TIMEOUT_MS = 120_000;

export const compressWithApi = async (
  job: ImageJob,
  options: CompressionOptions,
  signal?: AbortSignal
): Promise<ImageResult> => {
  const form = new FormData();
  form.append("file", job.file, job.name);
  form.append(
    "outputFormat",
    apiOutputFormat(job.inputFormat, options.outputFormat)
  );
  form.append("quality", String(options.quality));
  form.append("maintainAspect", String(options.maintainAspect));

  if (options.resizeEnabled) {
    if (options.resizeWidth > 0) {
      form.append("resizeWidth", String(options.resizeWidth));
    }
    if (options.resizeHeight > 0) {
      form.append("resizeHeight", String(options.resizeHeight));
    }
  }

  const response = await fetch(`${apiBase}/compress`, {
    body: form,
    method: "POST",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(API_TIMEOUT_MS)])
      : AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const blob = await response.blob();
  const headers = parseCompressionHeaders(response.headers);
  return resultFromBlob(blob, headers);
};
