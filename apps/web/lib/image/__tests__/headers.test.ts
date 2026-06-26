import { describe, expect, it } from "bun:test";

import { parseCompressionHeaders } from "../headers";

describe("parseCompressionHeaders", () => {
  it("parses compression response headers", () => {
    const headers = new Headers({
      "X-Compressed-Size": "1234",
      "X-Elapsed-Ms": "42",
      "X-Height": "720",
      "X-Original-Size": "5678",
      "X-Output-Format": "webp",
      "X-Width": "1280",
    });

    expect(parseCompressionHeaders(headers)).toEqual({
      compressedSize: 1234,
      elapsedMs: 42,
      height: 720,
      originalSize: 5678,
      outputFormat: "webp",
      width: 1280,
    });
  });

  it("defaults missing headers to zero and jpeg format", () => {
    expect(parseCompressionHeaders(new Headers())).toEqual({
      compressedSize: 0,
      elapsedMs: 0,
      height: 0,
      originalSize: 0,
      outputFormat: "jpeg",
      width: 0,
    });
  });
});
