import { compressWithApi } from "@/lib/compress/api";
import { compressWithBrowser } from "@/lib/compress/browser";
import { encodingKey } from "@/lib/image/encoding-key";
import { shouldUseBrowserEncoder } from "@/lib/image/format";
import type {
  CompressionOptions,
  EncodedImage,
  ImageJob,
  ImageResult,
} from "@/lib/image/types";

export interface Encoders {
  api: typeof compressWithApi;
  browser: typeof compressWithBrowser;
}

const DEFAULT_ENCODERS: Encoders = {
  api: compressWithApi,
  browser: compressWithBrowser,
};

// A PNG that did not shrink is returned byte for byte. Only PNG qualifies:
// JPEG originals can carry GPS EXIF that every encode path strips.
const keepOriginalIfLarger = (
  job: ImageJob,
  result: EncodedImage
): EncodedImage => {
  const keepsOriginal =
    job.inputFormat === "png" &&
    result.outputFormat === "png" &&
    result.width === job.width &&
    result.height === job.height &&
    result.size >= job.originalSize;

  if (!keepsOriginal) {
    return result;
  }

  URL.revokeObjectURL(result.url);
  return {
    ...result,
    blob: job.file,
    size: job.originalSize,
    url: URL.createObjectURL(job.file),
  };
};

const encodeOnRoute = async (
  job: ImageJob,
  options: CompressionOptions,
  signal: AbortSignal,
  encoders: Encoders
): Promise<EncodedImage> => {
  if (
    shouldUseBrowserEncoder(
      job.inputFormat,
      options.outputFormat,
      job.file.size
    )
  ) {
    return await encoders.browser(job, options);
  }

  try {
    return await encoders.api(job, options, signal);
  } catch (error) {
    // A superseded or removed job must not start a second encode.
    if (signal.aborted) {
      throw error;
    }
    // 422, 429, 504, network failure, and timeout all land here. The browser
    // can encode anything the API can, so the user still gets a result.
    return await encoders.browser(job, options);
  }
};

export const encodeJob = async (
  job: ImageJob,
  options: CompressionOptions,
  signal: AbortSignal,
  encoders: Encoders = DEFAULT_ENCODERS
): Promise<ImageResult> => {
  const encoded = keepOriginalIfLarger(
    job,
    await encodeOnRoute(job, options, signal, encoders)
  );
  return { ...encoded, settingsKey: encodingKey(job, options) };
};
