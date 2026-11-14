import { HEIC_JPEG_QUALITY } from "@/lib/image/constants";

const EXTENSION = /\.[^/.]+$/u;
// heic-to sends every decode to one inner worker, so parallelism needs one
// heic-to instance per pool worker. For 12 photos at 12 MP in Chromium, three
// workers finished as fast as four with 230 MB less peak memory.
const MAX_WORKERS = 3;
// Each worker keeps a libheif wasm heap alive until it is terminated.
const IDLE_TIMEOUT_MS = 10_000;

const idleWorkers: Worker[] = [];
const waiting: (() => void)[] = [];
let busy = 0;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

const poolSize = () =>
  Math.min(MAX_WORKERS, navigator.hardwareConcurrency || 1);

// WebKit leaves a terminated worker's nested worker running
// (https://bugs.webkit.org/show_bug.cgi?id=329407), and heic-to nests one in
// every pool worker. There an idle sweep would leak workers instead of freeing
// them, so WebKit keeps its pool, at most three, for the page's life.
const keepsIdleWorkers = () => navigator.vendor === "Apple Computer, Inc.";

const takeSlot = async () => {
  if (busy < poolSize()) {
    busy += 1;
    return;
  }
  // oxlint-disable-next-line promise/avoid-new
  await new Promise<void>((resolve) => {
    waiting.push(resolve);
  });
};

const terminateIdleWorkers = () => {
  for (const worker of idleWorkers.splice(0)) {
    worker.terminate();
  }
};

const releaseSlot = () => {
  const next = waiting.shift();
  if (next) {
    next();
    return;
  }
  busy -= 1;
  if (busy === 0 && !keepsIdleWorkers()) {
    idleTimer = setTimeout(terminateIdleWorkers, IDLE_TIMEOUT_MS);
  }
};

// A worker runs one file at a time, so each call replaces the previous
// handlers instead of adding listeners that pile up.
const convert = (worker: Worker, file: File) =>
  // oxlint-disable-next-line promise/avoid-new
  new Promise<Blob>((resolve, reject) => {
    // oxlint-disable-next-line unicorn/prefer-add-event-listener
    worker.onmessage = ({ data }: MessageEvent<Blob | string>) => {
      if (typeof data === "string") {
        reject(new Error(data));
      } else {
        resolve(data);
      }
    };
    // oxlint-disable-next-line unicorn/prefer-add-event-listener
    worker.onerror = (event) => {
      reject(new Error(event.message));
    };
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    worker.postMessage(file);
  });

const decodeInWorker = async (file: File): Promise<Blob> => {
  await takeSlot();
  clearTimeout(idleTimer);
  let worker: Worker | undefined;
  try {
    worker =
      idleWorkers.pop() ??
      // Bundlers only detect the worker entry with a ./ specifier.
      // oxlint-disable-next-line unicorn/relative-url-style
      new Worker(new URL("./heic-worker.ts", import.meta.url), {
        type: "module",
      });
    const blob = await convert(worker, file);
    idleWorkers.push(worker);
    return blob;
  } catch (error) {
    worker?.terminate();
    throw error;
  } finally {
    releaseSlot();
  }
};

const decodeOnMainThread = async (file: File): Promise<Blob> => {
  const { heicTo } = await import("heic-to");
  return await heicTo({
    blob: file,
    quality: HEIC_JPEG_QUALITY,
    type: "image/jpeg",
  });
};

export const decodeHeic = async (file: File): Promise<File> => {
  // Safari added nested workers before OffscreenCanvas, so this one check
  // covers both features the pool worker needs.
  const blob =
    typeof OffscreenCanvas === "function"
      ? await decodeInWorker(file)
      : await decodeOnMainThread(file);
  return new File([blob], file.name.replace(EXTENSION, ".jpg"), {
    type: "image/jpeg",
  });
};
