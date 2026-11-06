import { describe, expect, it } from "bun:test";

import { MAX_FILE_SIZE } from "../constants";
import {
  buildDownloadName,
  formatBytes,
  formatSavings,
  inputFormatOf,
  resolveOutputFormat,
  shouldUseBrowserEncoder,
} from "../format";

describe("formatBytes", () => {
  it("returns 0 B for non-positive values", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-1)).toBe("0 B");
  });

  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
  });
});

describe("formatSavings", () => {
  it("returns 0.0% for invalid sizes", () => {
    expect(formatSavings(0, 100)).toBe("0.0%");
  });

  it("shows negative savings when compressed is smaller", () => {
    expect(formatSavings(1000, 500)).toBe("-50.0%");
  });

  it("shows positive savings when compressed is larger", () => {
    expect(formatSavings(500, 1000)).toBe("+100.0%");
  });
});

const fileOf = (name: string, type: string) => new File([""], name, { type });

describe("inputFormatOf", () => {
  it("maps supported MIME types", () => {
    expect(inputFormatOf(fileOf("a.jpg", "image/jpeg"))).toBe("jpeg");
    expect(inputFormatOf(fileOf("a.png", "image/png"))).toBe("png");
    expect(inputFormatOf(fileOf("a.webp", "image/webp"))).toBe("webp");
  });

  it("treats image/heic and image/heif as heic", () => {
    expect(inputFormatOf(fileOf("a.heic", "image/heic"))).toBe("heic");
    expect(inputFormatOf(fileOf("a.heif", "image/heif"))).toBe("heic");
  });

  it("falls back to the extension when the MIME type is empty", () => {
    expect(inputFormatOf(fileOf("IMG_1.HEIC", ""))).toBe("heic");
    expect(inputFormatOf(fileOf("IMG_2.heif", ""))).toBe("heic");
  });

  it("returns null for unsupported files", () => {
    expect(inputFormatOf(fileOf("a.gif", "image/gif"))).toBeNull();
    expect(inputFormatOf(fileOf("a.txt", ""))).toBeNull();
  });
});

describe("resolveOutputFormat", () => {
  it("keeps the input format for same on encodable inputs", () => {
    expect(resolveOutputFormat("png", "same")).toBe("png");
  });

  it("resolves same on heic to jpeg", () => {
    expect(resolveOutputFormat("heic", "same")).toBe("jpeg");
  });

  it("honors an explicit choice", () => {
    expect(resolveOutputFormat("heic", "webp")).toBe("webp");
  });
});

describe("shouldUseBrowserEncoder", () => {
  const small = 1024;

  it("never sends heic to the API", () => {
    expect(shouldUseBrowserEncoder("heic", "jpeg", small)).toBe(true);
    expect(shouldUseBrowserEncoder("heic", "png", small)).toBe(true);
    expect(shouldUseBrowserEncoder("heic", "same", small)).toBe(true);
  });

  it("encodes webp output in the browser", () => {
    expect(shouldUseBrowserEncoder("webp", "same", small)).toBe(true);
    expect(shouldUseBrowserEncoder("jpeg", "webp", small)).toBe(true);
    expect(shouldUseBrowserEncoder("png", "webp", small)).toBe(true);
  });

  it("encodes jpeg output in the browser", () => {
    expect(shouldUseBrowserEncoder("jpeg", "jpeg", small)).toBe(true);
    expect(shouldUseBrowserEncoder("jpeg", "same", small)).toBe(true);
    expect(shouldUseBrowserEncoder("png", "jpeg", small)).toBe(true);
  });

  it("sends png to png through the API when the file fits", () => {
    expect(shouldUseBrowserEncoder("png", "png", small)).toBe(false);
    expect(shouldUseBrowserEncoder("png", "same", small)).toBe(false);
    expect(shouldUseBrowserEncoder("png", "png", MAX_FILE_SIZE)).toBe(false);
  });

  it("encodes png in the browser when the file exceeds the API limit", () => {
    expect(shouldUseBrowserEncoder("png", "png", MAX_FILE_SIZE + 1)).toBe(true);
  });

  it("keeps jpeg orientation by encoding jpeg to png in the browser", () => {
    expect(shouldUseBrowserEncoder("jpeg", "png", small)).toBe(true);
  });

  it("encodes webp to png in the browser only when the file is large", () => {
    expect(shouldUseBrowserEncoder("webp", "png", small)).toBe(false);
    expect(shouldUseBrowserEncoder("webp", "png", MAX_FILE_SIZE + 1)).toBe(
      true
    );
  });
});

describe("buildDownloadName", () => {
  it("replaces extension with pigo suffix", () => {
    expect(buildDownloadName("photo.png", "webp")).toBe("photo-pigo.webp");
    expect(buildDownloadName("photo.jpeg", "jpeg")).toBe("photo-pigo.jpg");
  });
});
