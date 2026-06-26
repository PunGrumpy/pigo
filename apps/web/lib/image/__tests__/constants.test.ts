import { describe, expect, it } from "bun:test";

import {
  DEFAULT_COMPRESSION_OPTIONS,
  normalizeQuality,
  sanitizeCompressionOptions,
} from "../constants";

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
});
