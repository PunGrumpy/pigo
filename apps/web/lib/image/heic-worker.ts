import { heicTo } from "heic-to";

import { HEIC_JPEG_QUALITY } from "@/lib/image/constants";

const toJpeg = async (file: File): Promise<Blob> => {
  const bitmap = await heicTo({ blob: file, type: "bitmap" });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("OffscreenCanvas 2D is unavailable in this worker.");
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return await canvas.convertToBlob({
    quality: HEIC_JPEG_QUALITY,
    type: "image/jpeg",
  });
};

globalThis.addEventListener("message", async (event: MessageEvent<File>) => {
  let result: Blob | string;
  try {
    result = await toJpeg(event.data);
  } catch (error) {
    result = String(error);
  }
  // A worker scope has no target origin.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin
  globalThis.postMessage(result);
});
