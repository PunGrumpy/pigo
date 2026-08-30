import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { MAX_DIMENSION, MAX_FILE_SIZE, MAX_PIXELS } from "../constants";

const goTypesPath = path.join(
  import.meta.dir,
  "../../../../../packages/core/types.go"
);

/**
 * Parses a Go integer literal from `packages/core/types.go` without `eval`.
 * Handles both plain literals with `_` digit separators (e.g. `100_000_000`)
 * and left-shift expressions (e.g. `20 << 20`).
 */
const parseGoIntLiteral = (literal: string): number => {
  const trimmed = literal.trim();
  if (trimmed.includes("<<")) {
    const [base, shift] = trimmed.split("<<").map((part) => part.trim());
    // oxlint-disable-next-line no-bitwise
    return Number(base) << Number(shift);
  }
  return Number(trimmed.replaceAll("_", ""));
};

const extractGoConstant = (source: string, name: string): number => {
  const pattern = new RegExp(`${name}\\s*=\\s*([^\\n]+?)(?:\\s*//.*)?$`, "mu");
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not find Go constant ${name} in types.go`);
  }
  return parseGoIntLiteral(match[1]);
};

describe("web/Go limit constants parity", () => {
  const goSource = readFileSync(goTypesPath, "utf-8");

  it("MAX_FILE_SIZE mirrors MaxFileSize", () => {
    expect(MAX_FILE_SIZE).toBe(extractGoConstant(goSource, "MaxFileSize"));
  });

  it("MAX_PIXELS mirrors MaxPixels", () => {
    expect(MAX_PIXELS).toBe(extractGoConstant(goSource, "MaxPixels"));
  });

  it("MAX_DIMENSION mirrors MaxDimension", () => {
    expect(MAX_DIMENSION).toBe(extractGoConstant(goSource, "MaxDimension"));
  });
});
