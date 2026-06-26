import { describe, expect, it } from "bun:test";

import {
  apiOutputFormat,
  buildDownloadName,
  formatBytes,
  formatSavings,
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

describe("shouldUseBrowserEncoder", () => {
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
});

describe("buildDownloadName", () => {
  it("replaces extension with pigo suffix", () => {
    expect(buildDownloadName("photo.png", "webp")).toBe("photo-pigo.webp");
    expect(buildDownloadName("photo.jpeg", "jpeg")).toBe("photo-pigo.jpg");
  });
});
