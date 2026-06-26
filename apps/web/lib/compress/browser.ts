import type {
  CompressionOptions,
  ImageJob,
  ImageResult,
} from "@/lib/image/types";

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

const encodeWebpBlob = async (
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> => {
  const dataUrl = canvas.toDataURL(
    "image/webp",
    Math.min(1, Math.max(0.01, quality))
  );
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  if (!blob.size) {
    throw new Error("This browser could not encode WebP.");
  }
  return blob;
};

export const compressWithBrowser = async (
  job: ImageJob,
  options: CompressionOptions
): Promise<ImageResult> => {
  const start = performance.now();
  const bitmap = await createImageBitmap(job.file);
  const target = targetDimensions(bitmap.width, bitmap.height, options);
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Canvas is unavailable in this browser.");
  }

  context.clearRect(0, 0, target.width, target.height);
  context.drawImage(bitmap, 0, 0, target.width, target.height);
  bitmap.close();

  const blob = await encodeWebpBlob(canvas, options.quality / 100);
  return {
    blob,
    elapsedMs: Math.round(performance.now() - start),
    height: target.height,
    outputFormat: "webp",
    size: blob.size,
    url: URL.createObjectURL(blob),
    width: target.width,
  };
};
