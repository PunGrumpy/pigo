import { describe, expect, it } from "bun:test";

import {
  apiOutputFormat,
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
  it("never sends heic to the API", () => {
    expect(shouldUseBrowserEncoder("heic", "jpeg")).toBe(true);
    expect(shouldUseBrowserEncoder("heic", "png")).toBe(true);
    expect(shouldUseBrowserEncoder("heic", "same")).toBe(true);
  });

  it("uses browser encoder for webp same-format output", () => {
    expect(shouldUseBrowserEncoder("webp", "same")).toBe(true);
  });

  it("uses browser encoder for explicit webp output", () => {
    expect(shouldUseBrowserEncoder("jpeg", "webp")).toBe(true);
  });

  it("uses API encoder for jpeg same-format output", () => {
    expect(shouldUseBrowserEncoder("jpeg", "jpeg")).toBe(false);
    expect(shouldUseBrowserEncoder("jpeg", "same")).toBe(false);
  });
});

describe("apiOutputFormat", () => {
  it("returns API-compatible formats", () => {
    expect(apiOutputFormat("jpeg", "same")).toBe("same");
    expect(apiOutputFormat("png", "png")).toBe("png");
    expect(apiOutputFormat("jpeg", "jpeg")).toBe("jpeg");
  });

  it("rejects webp output for the API", () => {
    expect(() => apiOutputFormat("jpeg", "webp")).toThrow(
      /encoded in the browser/u
    );
    expect(() => apiOutputFormat("webp", "same")).toThrow(
      /encoded in the browser/u
    );
  });

  it("rejects heic input for the API", () => {
    expect(() => apiOutputFormat("heic", "jpeg")).toThrow(
      /encoded in the browser/u
    );
  });
});

describe("buildDownloadName", () => {
  it("replaces extension with pigo suffix", () => {
    expect(buildDownloadName("photo.png", "webp")).toBe("photo-pigo.webp");
    expect(buildDownloadName("photo.jpeg", "jpeg")).toBe("photo-pigo.jpg");
  });
});
