import { describe, expect, it } from "bun:test";

import { encodingKey } from "../encoding-key";
import type { CompressionOptions, ImageJob } from "../types";

const options: CompressionOptions = {
  maintainAspect: true,
  outputFormat: "same",
  quality: 82,
  resizeEnabled: false,
  resizeHeight: 0,
  resizeWidth: 0,
  targetSizeKb: 0,
};

const makeJob = (
  inputFormat: ImageJob["inputFormat"]
): Pick<ImageJob, "height" | "inputFormat" | "width"> => ({
  height: 100,
  inputFormat,
  width: 200,
});

describe("encodingKey", () => {
  it("ignores quality when the output is PNG", () => {
    const job = makeJob("png");
    expect(encodingKey(job, { ...options, quality: 40 })).toBe(
      encodingKey(job, { ...options, quality: 90 })
    );
  });

  it("ignores quality for PNG chosen explicitly from a JPEG source", () => {
    const job = makeJob("jpeg");
    const png = { ...options, outputFormat: "png" } as const;
    expect(encodingKey(job, { ...png, quality: 40 })).toBe(
      encodingKey(job, { ...png, quality: 90 })
    );
  });

  it("changes with quality when the output is JPEG or WebP", () => {
    const jpeg = makeJob("jpeg");
    const webp = { ...options, outputFormat: "webp" } as const;
    expect(encodingKey(jpeg, { ...options, quality: 40 })).not.toBe(
      encodingKey(jpeg, { ...options, quality: 90 })
    );
    expect(encodingKey(jpeg, { ...webp, quality: 40 })).not.toBe(
      encodingKey(jpeg, { ...webp, quality: 90 })
    );
  });

  it("changes with the resolved output format", () => {
    const job = makeJob("jpeg");
    expect(encodingKey(job, options)).not.toBe(
      encodingKey(job, { ...options, outputFormat: "webp" })
    );
  });

  it("treats same and the explicit equal format as one output", () => {
    const job = makeJob("jpeg");
    expect(encodingKey(job, options)).toBe(
      encodingKey(job, { ...options, outputFormat: "jpeg" })
    );
  });

  it("resolves HEIC to JPEG", () => {
    expect(encodingKey(makeJob("heic"), options)).toBe(
      encodingKey(makeJob("jpeg"), options)
    );
  });

  it("uses the resized dimensions, not the resize flag", () => {
    const job = makeJob("jpeg");
    const resized = {
      ...options,
      resizeEnabled: true,
      resizeWidth: 100,
    };
    expect(encodingKey(job, resized)).not.toBe(encodingKey(job, options));
    // A resize to the original width lands on the original dimensions.
    expect(encodingKey(job, { ...resized, resizeWidth: 200 })).toBe(
      encodingKey(job, options)
    );
  });

  it("ignores quality when a target size is set on a lossy output", () => {
    const job = makeJob("jpeg");
    const targeted = { ...options, targetSizeKb: 200 };
    expect(encodingKey(job, { ...targeted, quality: 40 })).toBe(
      encodingKey(job, { ...targeted, quality: 90 })
    );
  });

  it("changes with the target size and when the target turns on", () => {
    const job = makeJob("jpeg");
    expect(encodingKey(job, { ...options, targetSizeKb: 200 })).not.toBe(
      encodingKey(job, { ...options, targetSizeKb: 300 })
    );
    expect(encodingKey(job, { ...options, targetSizeKb: 200 })).not.toBe(
      encodingKey(job, options)
    );
  });

  it("does not mix a target of 82 KB with quality 82", () => {
    const job = makeJob("jpeg");
    expect(encodingKey(job, { ...options, targetSizeKb: 82 })).not.toBe(
      encodingKey(job, options)
    );
  });

  it("ignores the target size when the output is PNG", () => {
    const job = makeJob("png");
    expect(encodingKey(job, { ...options, targetSizeKb: 200 })).toBe(
      encodingKey(job, options)
    );
  });
});
