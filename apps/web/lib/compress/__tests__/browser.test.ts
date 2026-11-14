import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import type { CompressionOptions } from "../../image/types";
import {
  assertTargetWithinLimits,
  encodeBitmap,
  encodeToTarget,
  targetDimensions,
} from "../browser";

const baseOptions: CompressionOptions = {
  maintainAspect: true,
  outputFormat: "same",
  quality: 82,
  resizeEnabled: false,
  resizeHeight: 0,
  resizeWidth: 0,
  targetSizeKb: 0,
};

describe("targetDimensions", () => {
  it("returns original dimensions when resize is disabled", () => {
    expect(targetDimensions(1920, 1080, baseOptions)).toEqual({
      height: 1080,
      width: 1920,
    });
  });

  it("scales to fit both bounds while maintaining aspect ratio", () => {
    expect(
      targetDimensions(1920, 1080, {
        ...baseOptions,
        resizeEnabled: true,
        resizeHeight: 540,
        resizeWidth: 960,
      })
    ).toEqual({
      height: 540,
      width: 960,
    });
  });

  it("uses explicit width and height when aspect ratio is not maintained", () => {
    expect(
      targetDimensions(1920, 1080, {
        ...baseOptions,
        maintainAspect: false,
        resizeEnabled: true,
        resizeHeight: 600,
        resizeWidth: 800,
      })
    ).toEqual({
      height: 600,
      width: 800,
    });
  });

  it("derives height from width when only width is set", () => {
    expect(
      targetDimensions(1920, 1080, {
        ...baseOptions,
        resizeEnabled: true,
        resizeHeight: 0,
        resizeWidth: 960,
      })
    ).toEqual({
      height: 540,
      width: 960,
    });
  });
});

describe("assertTargetWithinLimits", () => {
  it("accepts the largest allowed dimensions", () => {
    expect(() => assertTargetWithinLimits(16_384, 6103)).not.toThrow();
    expect(() => assertTargetWithinLimits(10_000, 10_000)).not.toThrow();
  });

  it("rejects a product above the 100MP limit", () => {
    expect(() => assertTargetWithinLimits(10_001, 10_000)).toThrow(
      "resized image exceeds the 100MP pixel limit"
    );
  });

  it("rejects a side above the per-side limit", () => {
    expect(() => assertTargetWithinLimits(16_385, 1)).toThrow(
      "resized image exceeds the 16384 pixel per-side limit"
    );
    expect(() => assertTargetWithinLimits(1, 16_385)).toThrow(
      "resized image exceeds the 16384 pixel per-side limit"
    );
  });
});

const noop = () => null;

describe("encodeBitmap", () => {
  const bitmap = { close: noop, height: 4, width: 4 } as ImageBitmap;
  const context = { drawImage: noop, fillRect: noop };
  const originalOffscreenCanvas = globalThis.OffscreenCanvas;

  const stubOffscreenCanvas = (type: string) => {
    const blob = new Blob(["x"], { type });
    globalThis.OffscreenCanvas = function FakeOffscreenCanvas() {
      return {
        convertToBlob: () => Promise.resolve(blob),
        getContext: () => context,
      };
    } as unknown as typeof OffscreenCanvas;
  };

  const stubCanvasElement = (type: string) => {
    // @ts-expect-error -- exercises the HTMLCanvasElement fallback
    globalThis.OffscreenCanvas = undefined;
    const blob = new Blob(["x"], { type });
    spyOn(document, "createElement").mockReturnValue({
      getContext: () => context,
      toBlob: (resolve: BlobCallback) => resolve(blob),
    } as unknown as HTMLElement);
  };

  afterEach(() => {
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
    mock.restore();
  });

  it("returns the blob when OffscreenCanvas honors the format", async () => {
    stubOffscreenCanvas("image/webp");
    const blob = await encodeBitmap(bitmap, "webp", 4, 4, 0.8);
    expect(blob.type).toBe("image/webp");
  });

  it("rejects an OffscreenCanvas blob in another format", async () => {
    stubOffscreenCanvas("image/png");
    await expect(encodeBitmap(bitmap, "webp", 4, 4, 0.8)).rejects.toThrow(
      "This browser could not encode webp."
    );
  });

  it("returns the blob when toBlob honors the format", async () => {
    stubCanvasElement("image/jpeg");
    const blob = await encodeBitmap(bitmap, "jpeg", 4, 4, 0.8);
    expect(blob.type).toBe("image/jpeg");
  });

  it("rejects a toBlob result in another format", async () => {
    stubCanvasElement("image/png");
    await expect(encodeBitmap(bitmap, "jpeg", 4, 4, 0.8)).rejects.toThrow(
      "This browser could not encode jpeg."
    );
  });
});

describe("encodeToTarget", () => {
  const originalOffscreenCanvas = globalThis.OffscreenCanvas;
  const KB = 1024;
  const bitmap = { close: noop, height: 4, width: 4 } as ImageBitmap;

  // Size in bytes grows with quality: 1 KB per quality point.
  const stubCanvas = () => {
    const drawImage = mock(noop);
    const qualities: number[] = [];
    globalThis.OffscreenCanvas = function FakeOffscreenCanvas() {
      return {
        convertToBlob: ({ quality, type }: ImageEncodeOptions) => {
          const percent = Math.round((quality ?? 0) * 100);
          qualities.push(percent);
          return Promise.resolve(
            new Blob([new Uint8Array(percent * KB)], { type })
          );
        },
        getContext: () => ({ drawImage, fillRect: noop }),
      };
    } as unknown as typeof OffscreenCanvas;
    return { drawImage, qualities };
  };

  afterEach(() => {
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
    mock.restore();
  });

  it("draws once and finds the highest quality that fits", async () => {
    const { drawImage, qualities } = stubCanvas();
    const match = await encodeToTarget(bitmap, "jpeg", 4, 4, 60 * KB);

    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(qualities.length).toBeGreaterThan(1);
    expect(match.blob.size).toBeLessThanOrEqual(60 * KB);
    expect(match.blob.size).toBeGreaterThanOrEqual(54 * KB);
    expect(match.overTarget).toBe(false);
  });

  it("flags a result that cannot reach the target", async () => {
    stubCanvas();
    const match = await encodeToTarget(bitmap, "webp", 4, 4, KB / 2);

    expect(match.quality).toBe(1);
    expect(match.overTarget).toBe(true);
  });
});
