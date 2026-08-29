import type {
  CompressionOptions,
  ImageJob,
  ImageResult,
} from "@/lib/image/types";

const clampQuality = (quality: number) => Math.min(1, Math.max(0.01, quality));

const draw2d = (
  canvas: HTMLCanvasElement | OffscreenCanvas,
  bitmap: ImageBitmap,
  width: number,
  height: number
) => {
  const context = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!context) {
    throw new Error("Canvas is unavailable in this browser.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
};

/**
 * Encodes a bitmap to WebP off the main thread where possible.
 *
 * `OffscreenCanvas.convertToBlob` hands the encode to a browser-managed thread;
 * `HTMLCanvasElement.toBlob` is the async fallback. Both beat `toDataURL`, which
 * blocks the main thread for the whole encode and pays a base64 round trip on
 * top of it.
 */
const encodeWebp = async (
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number
): Promise<Blob> => {
  const normalized = clampQuality(quality);

  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    draw2d(canvas, bitmap, width, height);
    return await canvas.convertToBlob({
      quality: normalized,
      type: "image/webp",
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw2d(canvas, bitmap, width, height);

  // oxlint-disable-next-line promise/avoid-new
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob?.size) {
          resolve(blob);
          return;
        }
        reject(new Error("This browser could not encode WebP."));
      },
      "image/webp",
      normalized
    );
  });
};

export const readDimensions = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  const dimensions = { height: bitmap.height, width: bitmap.width };
  bitmap.close();
  return dimensions;
};

export const targetDimensions = (
  width: number,
  height: number,
  options: CompressionOptions
) => {
  if (
    !options.resizeEnabled ||
    (options.resizeWidth <= 0 && options.resizeHeight <= 0)
  ) {
    return { height, width };
  }

  if (!options.maintainAspect) {
    return {
      height: options.resizeHeight || height,
      width: options.resizeWidth || width,
    };
  }

  const aspect = width / height;
  if (options.resizeWidth > 0 && options.resizeHeight > 0) {
    const scale = Math.min(
      options.resizeWidth / width,
      options.resizeHeight / height
    );
    return {
      height: Math.max(1, Math.round(height * scale)),
      width: Math.max(1, Math.round(width * scale)),
    };
  }
  if (options.resizeWidth > 0) {
    return {
      height: Math.max(1, Math.round(options.resizeWidth / aspect)),
      width: options.resizeWidth,
    };
  }
  return {
    height: options.resizeHeight,
    width: Math.max(1, Math.round(options.resizeHeight * aspect)),
  };
};

export const compressWithBrowser = async (
  job: ImageJob,
  options: CompressionOptions
): Promise<ImageResult> => {
  const start = performance.now();
  const bitmap = await createImageBitmap(job.file);

  try {
    const target = targetDimensions(bitmap.width, bitmap.height, options);
    const blob = await encodeWebp(
      bitmap,
      target.width,
      target.height,
      options.quality / 100
    );

    return {
      blob,
      elapsedMs: Math.round(performance.now() - start),
      height: target.height,
      outputFormat: "webp",
      size: blob.size,
      url: URL.createObjectURL(blob),
      width: target.width,
    };
  } finally {
    bitmap.close();
  }
};
