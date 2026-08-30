import { describe, expect, it } from "bun:test";

import {
  DEFAULT_COMPRESSION_OPTIONS,
  MAX_DIMENSION,
  MAX_FILE_SIZE,
  MAX_PIXELS,
  normalizeQuality,
  sanitizeCompressionOptions,
} from "../constants";

// These mirror packages/core/types.go; if this test fails, the Go and TS
// limits have drifted — fix whichever side changed without the other.
it("mirrors the Go server limits", () => {
  expect(MAX_FILE_SIZE).toBe(20 * 1024 * 1024);
  expect(MAX_PIXELS).toBe(100_000_000);
  expect(MAX_DIMENSION).toBe(16_384);
});

describe("normalizeQuality", () => {
  it("clamps values to 1-100", () => {
    expect(normalizeQuality(1)).toBe(1);
    expect(normalizeQuality(100)).toBe(100);
    expect(normalizeQuality(0)).toBe(1);
    expect(normalizeQuality(150)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(normalizeQuality(82.4)).toBe(82);
    expect(normalizeQuality(82.6)).toBe(83);
  });

  it("falls back to default for invalid values", () => {
    expect(normalizeQuality(Number.NaN)).toBe(
      DEFAULT_COMPRESSION_OPTIONS.quality
    );
    expect(normalizeQuality(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_COMPRESSION_OPTIONS.quality
    );
  });
});

describe("sanitizeCompressionOptions", () => {
  it("fills missing fields from defaults", () => {
    expect(
      sanitizeCompressionOptions({
        maintainAspect: true,
        outputFormat: "jpeg",
        quality: 50,
        resizeEnabled: false,
        resizeHeight: 0,
        resizeWidth: 0,
      })
    ).toEqual({
      ...DEFAULT_COMPRESSION_OPTIONS,
      outputFormat: "jpeg",
      quality: 50,
    });
  });

  it("restores invalid output format to default", () => {
    expect(
      sanitizeCompressionOptions({
        maintainAspect: true,
        outputFormat: "webp" as "jpeg",
        quality: 50,
        resizeEnabled: false,
        resizeHeight: 0,
        resizeWidth: 0,
      }).outputFormat
    ).toBe("webp");

    expect(
      sanitizeCompressionOptions({
        maintainAspect: true,
        outputFormat: "invalid" as "jpeg",
        quality: 50,
        resizeEnabled: false,
        resizeHeight: 0,
        resizeWidth: 0,
      }).outputFormat
    ).toBe(DEFAULT_COMPRESSION_OPTIONS.outputFormat);
  });

  it("clamps resize dimensions to MAX_DIMENSION", () => {
    expect(
      sanitizeCompressionOptions({
        maintainAspect: true,
        outputFormat: "jpeg",
        quality: 50,
        resizeEnabled: true,
        resizeHeight: 999_999,
        resizeWidth: 999_999,
      })
    ).toMatchObject({
      resizeHeight: MAX_DIMENSION,
      resizeWidth: MAX_DIMENSION,
    });
  });

  it("floors negative or invalid resize dimensions to 0", () => {
    expect(
      sanitizeCompressionOptions({
        maintainAspect: true,
        outputFormat: "jpeg",
        quality: 50,
        resizeEnabled: true,
        resizeHeight: Number.NaN,
        resizeWidth: -5,
      })
    ).toMatchObject({
      resizeHeight: 0,
      resizeWidth: 0,
    });
  });

  it("rounds fractional resize dimensions", () => {
    expect(
      sanitizeCompressionOptions({
        maintainAspect: true,
        outputFormat: "jpeg",
        quality: 50,
        resizeEnabled: true,
        resizeHeight: 800.6,
        resizeWidth: 800.6,
      })
    ).toMatchObject({
      resizeHeight: 801,
      resizeWidth: 801,
    });
  });
});
