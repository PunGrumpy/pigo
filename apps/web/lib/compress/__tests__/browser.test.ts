import { describe, expect, it } from "bun:test";

import type { CompressionOptions } from "../../image/types";
import { assertTargetWithinLimits, targetDimensions } from "../browser";

const baseOptions: CompressionOptions = {
  maintainAspect: true,
  outputFormat: "same",
  quality: 82,
  resizeEnabled: false,
  resizeHeight: 0,
  resizeWidth: 0,
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
