import { describe, expect, it } from "bun:test";

import { parseExifFromBuffer } from "../exif";

// --- Minimal EXIF/TIFF fixture builder -------------------------------------
// Builds a byte-accurate JPEG+EXIF payload so the parser's inline/out-of-line
// value math and segment walk can be exercised without a binary fixture file.

const u16 = (n: number, le: boolean): number[] => {
  const buf = new ArrayBuffer(2);
  new DataView(buf).setUint16(0, n, le);
  return [...new Uint8Array(buf)];
};

const u32 = (n: number, le: boolean): number[] => {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, n, le);
  return [...new Uint8Array(buf)];
};

const ascii = (s: string): number[] =>
  Array.from(s, (c) => c.codePointAt(0) ?? 0);

const pad4 = (bytes: number[]): number[] => {
  const padded = bytes.slice(0, 4);
  while (padded.length < 4) {
    padded.push(0);
  }
  return padded;
};

const entry = (
  tag: number,
  type: number,
  count: number,
  valueBytes: number[],
  le: boolean
): number[] => [
  ...u16(tag, le),
  ...u16(type, le),
  ...u32(count, le),
  ...pad4(valueBytes),
];

const buildSubIfd = (le: boolean, extraOffset: number) => {
  const exposureOffset = extraOffset;
  const fNumberOffset = extraOffset + 8;
  const focalOffset = extraOffset + 16;

  const entries = [
    // ExposureTime 1/250
    entry(0x82_9a, 5, 1, u32(exposureOffset, le), le),
    // FNumber 18/10
    entry(0x82_9d, 5, 1, u32(fNumberOffset, le), le),
    // ISO, inline SHORT
    entry(0x88_27, 3, 1, u16(200, le), le),
    // FocalLength 35/1
    entry(0x92_0a, 5, 1, u32(focalOffset, le), le),
  ];
  const nextIfdOffset = u32(0, le);
  const structBytes = [
    ...u16(entries.length, le),
    ...entries.flat(),
    ...nextIfdOffset,
  ];
  const extraBytes = [
    ...u32(1, le),
    ...u32(250, le),
    ...u32(18, le),
    ...u32(10, le),
    ...u32(35, le),
    ...u32(1, le),
  ];
  return { extraBytes, structBytes };
};

const buildTiff = (le: boolean): number[] => {
  const header = [...ascii(le ? "II" : "MM"), ...u16(42, le), ...u32(8, le)];

  const ifd0Offset = 8;
  const ifd0StructLen = 2 + 3 * 12 + 4;
  const modelOffset = ifd0Offset + ifd0StructLen;
  // count 12, out-of-line
  const modelBytes = ascii("TestModel01\0");
  const subIfdOffset = modelOffset + modelBytes.length;
  const subIfdStructLen = 2 + 4 * 12 + 4;
  const subExtraOffset = subIfdOffset + subIfdStructLen;

  const ifd0Entries = [
    // Make, inline ASCII
    entry(0x01_0f, 2, 4, ascii("ABC\0"), le),
    // Model, out-of-line
    entry(0x01_10, 2, modelBytes.length, u32(modelOffset, le), le),
    // Exif IFD pointer
    entry(0x87_69, 4, 1, u32(subIfdOffset, le), le),
  ];
  const ifd0 = [
    ...u16(ifd0Entries.length, le),
    ...ifd0Entries.flat(),
    ...u32(0, le),
  ];

  const subIfd = buildSubIfd(le, subExtraOffset);

  return [
    ...header,
    ...ifd0,
    ...modelBytes,
    ...subIfd.structBytes,
    ...subIfd.extraBytes,
  ];
};

const app1Segment = (payload: number[]): number[] => [
  0xff,
  0xe1,
  ...u16(payload.length + 2, false),
  ...payload,
];

const buildExifApp1 = (le: boolean): number[] =>
  app1Segment([...ascii("Exif"), 0x00, 0x00, ...buildTiff(le)]);

const buildJpegWithExif = (le: boolean): Uint8Array =>
  new Uint8Array([0xff, 0xd8, ...buildExifApp1(le)]);

const buildJpegWithXmpThenExif = (le: boolean): Uint8Array => {
  const xmpSegment = app1Segment(ascii("http://ns.adobe.com/xap/1.0/\0"));
  return new Uint8Array([0xff, 0xd8, ...xmpSegment, ...buildExifApp1(le)]);
};

const buildJpegWithCorruptSegmentLength = (): Uint8Array =>
  new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00]);

// bun's Uint8Array.buffer is typed as ArrayBufferLike (it may back onto a
// SharedArrayBuffer); these fixtures never do, so this narrows it back to
// the concrete ArrayBuffer that parseExifFromBuffer expects.
const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer as ArrayBuffer;

// --- Tests -------------------------------------------------------------

describe("parseExifFromBuffer", () => {
  it("reads tags from a little-endian (II) fixture", () => {
    const result = parseExifFromBuffer(toArrayBuffer(buildJpegWithExif(true)));
    expect(result).toEqual({
      exposureTime: "1/250",
      fNumber: "f/1.8",
      focalLength: "35mm",
      iso: 200,
      make: "ABC",
      model: "TestModel01",
    });
  });

  it("reads tags from a big-endian (MM) fixture", () => {
    const result = parseExifFromBuffer(toArrayBuffer(buildJpegWithExif(false)));
    expect(result).toEqual({
      exposureTime: "1/250",
      fNumber: "f/1.8",
      focalLength: "35mm",
      iso: 200,
      make: "ABC",
      model: "TestModel01",
    });
  });

  it("never throws when truncated right inside a later APP1 marker", () => {
    // Cuts off just after the Exif segment's two marker bytes, before its
    // length field — exercises the unguarded segment walk directly, not
    // the already try/catch-wrapped TIFF parsing.
    const xmp = app1Segment(ascii("http://ns.adobe.com/xap/1.0/\0"));
    const exif = buildExifApp1(true);
    const full = new Uint8Array([0xff, 0xd8, ...xmp, ...exif]);
    const truncated = full.slice(0, 2 + xmp.length + 2);
    expect(() => parseExifFromBuffer(toArrayBuffer(truncated))).not.toThrow();
  });

  it("finds the Exif APP1 segment even when an XMP APP1 comes first", () => {
    const result = parseExifFromBuffer(
      toArrayBuffer(buildJpegWithXmpThenExif(true))
    );
    expect(result?.make).toBe("ABC");
    expect(result?.exposureTime).toBe("1/250");
  });

  it("returns null for non-JPEG bytes", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(parseExifFromBuffer(toArrayBuffer(bytes))).toBeNull();
  });

  it("terminates on a zero-length segment instead of hanging", () => {
    const bytes = buildJpegWithCorruptSegmentLength();
    expect(parseExifFromBuffer(toArrayBuffer(bytes))).toBeNull();
  });
});
