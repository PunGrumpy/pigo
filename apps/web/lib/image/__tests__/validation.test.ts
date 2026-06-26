import { describe, expect, it } from "bun:test";

import { MAX_FILE_SIZE, MAX_FILES } from "../constants";
import { validateDimensions, validateFile } from "../validation";

const file = (name: string, type: string, size: number) =>
  new File([new Uint8Array(size)], name, { type });

describe("validateFile", () => {
  it("accepts supported image types", () => {
    expect(validateFile(file("a.jpg", "image/jpeg", 100), 0)).toBeNull();
  });

  it("rejects when queue is full", () => {
    expect(validateFile(file("a.jpg", "image/jpeg", 100), MAX_FILES)).toMatch(
      /up to 10 files/u
    );
  });

  it("rejects unsupported mime types", () => {
    expect(validateFile(file("a.gif", "image/gif", 100), 0)).toMatch(
      /not a JPEG, PNG, or WebP/u
    );
  });

  it("rejects files larger than max size", () => {
    expect(
      validateFile(file("big.jpg", "image/jpeg", MAX_FILE_SIZE + 1), 0)
    ).toMatch(/larger than/u);
  });
});

describe("validateDimensions", () => {
  it("accepts valid dimensions", () => {
    expect(validateDimensions(1920, 1080, "photo.jpg")).toBeNull();
  });

  it("rejects invalid dimensions", () => {
    expect(validateDimensions(0, 1080, "photo.jpg")).toMatch(
      /invalid dimensions/u
    );
  });

  it("rejects images exceeding pixel limit", () => {
    expect(validateDimensions(20_000, 20_000, "huge.jpg")).toMatch(
      /100MP pixel limit/u
    );
  });
});
