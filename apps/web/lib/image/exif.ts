export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  software?: string;
  exposureTime?: string;
  fNumber?: string;
  iso?: number;
  focalLength?: string;
}

const readString = (view: DataView, offset: number, length: number): string => {
  let str = "";
  for (let i = 0; i < length; i += 1) {
    const charCode = view.getUint8(offset + i);
    if (charCode === 0) {
      break;
    }
    str += String.fromCodePoint(charCode);
  }
  return str.trim();
};

// Bytes-per-component for the TIFF tag types this parser reads.
const TYPE_SIZES: Record<number, number> = {
  1: 1,
  10: 8,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  7: 1,
  9: 4,
};

// A tag's value lives inline in its 4-byte offset field only when the full
// value (count * bytes-per-component) fits in those 4 bytes; otherwise the
// offset field points elsewhere in the TIFF block.
const valuePosition = (
  entryOffset: number,
  tiffOffset: number,
  valueOffset: number,
  type: number,
  count: number
): number => {
  const size = (TYPE_SIZES[type] ?? 1) * count;
  return size <= 4 ? entryOffset + 8 : tiffOffset + valueOffset;
};

const fitsInView = (view: DataView, pos: number, width: number): boolean =>
  pos >= 0 && pos + width <= view.byteLength;

const parseSubIfd = (
  view: DataView,
  subIfdOffset: number,
  isLittleEndian: boolean,
  tiffOffset: number,
  exifData: ExifData
): void => {
  try {
    const subNumEntries = view.getUint16(subIfdOffset, isLittleEndian);
    let subEntryOffset = subIfdOffset + 2;

    for (let j = 0; j < subNumEntries; j += 1) {
      const subTag = view.getUint16(subEntryOffset, isLittleEndian);
      const subType = view.getUint16(subEntryOffset + 2, isLittleEndian);
      const subCount = view.getUint32(subEntryOffset + 4, isLittleEndian);
      const subValueOffset = view.getUint32(subEntryOffset + 8, isLittleEndian);
      const subValPos = valuePosition(
        subEntryOffset,
        tiffOffset,
        subValueOffset,
        subType,
        subCount
      );

      if (subTag === 0x82_9a && fitsInView(view, subValPos, 8)) {
        // ExposureTime
        const num = view.getUint32(subValPos, isLittleEndian);
        const den = view.getUint32(subValPos + 4, isLittleEndian);
        if (den > 0) {
          exifData.exposureTime =
            num === 1 ? `1/${den}` : `${(num / den).toFixed(2)}s`;
        }
      } else if (subTag === 0x82_9d && fitsInView(view, subValPos, 8)) {
        // FNumber
        const num = view.getUint32(subValPos, isLittleEndian);
        const den = view.getUint32(subValPos + 4, isLittleEndian);
        if (den > 0) {
          exifData.fNumber = `f/${(num / den).toFixed(1)}`;
        }
      } else if (subTag === 0x88_27 && fitsInView(view, subValPos, 2)) {
        // ISO
        exifData.iso = view.getUint16(subValPos, isLittleEndian);
      } else if (subTag === 0x92_0a && fitsInView(view, subValPos, 8)) {
        // FocalLength
        const num = view.getUint32(subValPos, isLittleEndian);
        const den = view.getUint32(subValPos + 4, isLittleEndian);
        if (den > 0) {
          exifData.focalLength = `${Math.round(num / den)}mm`;
        }
      }
      subEntryOffset += 12;
    }
  } catch {
    // Ignore sub-IFD errors
  }
};

const parseTiff = (view: DataView, tiffOffset: number): ExifData => {
  const byteOrder = view.getUint16(tiffOffset);
  // "II" for Little Endian
  const isLittleEndian = byteOrder === 0x49_49;

  const firstIfdOffset = view.getUint32(tiffOffset + 4, isLittleEndian);
  const ifdOffset = tiffOffset + firstIfdOffset;

  const exifData: ExifData = {};

  try {
    const numEntries = view.getUint16(ifdOffset, isLittleEndian);
    let entryOffset = ifdOffset + 2;

    for (let i = 0; i < numEntries; i += 1) {
      const tag = view.getUint16(entryOffset, isLittleEndian);
      const type = view.getUint16(entryOffset + 2, isLittleEndian);
      const count = view.getUint32(entryOffset + 4, isLittleEndian);
      const valueOffset = view.getUint32(entryOffset + 8, isLittleEndian);

      const valPos = valuePosition(
        entryOffset,
        tiffOffset,
        valueOffset,
        type,
        count
      );
      const hasStringValue = fitsInView(view, valPos, count);

      if (tag === 0x01_0f && hasStringValue) {
        // Make
        exifData.make = readString(view, valPos, count);
      } else if (tag === 0x01_10 && hasStringValue) {
        // Model
        exifData.model = readString(view, valPos, count);
      } else if (tag === 0x01_32 && hasStringValue) {
        // DateTime
        exifData.dateTime = readString(view, valPos, count);
      } else if (tag === 0x01_05 && hasStringValue) {
        // Software
        exifData.software = readString(view, valPos, count);
      } else if (tag === 0x87_69) {
        // Exif IFD Pointer
        const subIfdOffset = tiffOffset + valueOffset;
        parseSubIfd(view, subIfdOffset, isLittleEndian, tiffOffset, exifData);
      }
      entryOffset += 12;
    }
  } catch {
    // Ignore parser errors and return what we successfully extracted
  }

  return exifData;
};

const EXIF_SCAN_BYTES = 128 * 1024;

export const parseExifFromBuffer = (buffer: ArrayBuffer): ExifData | null => {
  try {
    const view = new DataView(buffer);

    if (view.byteLength < 4 || view.getUint16(0) !== 0xff_d8) {
      // Not JPEG
      return null;
    }

    let offset = 2;
    while (fitsInView(view, offset, 4)) {
      if (view.getUint8(offset) !== 0xff) {
        // Lost sync with marker boundaries
        break;
      }
      const marker = view.getUint16(offset);
      if (marker === 0xff_da) {
        // Start of Scan: entropy-coded data follows, not more segments
        break;
      }

      const length = view.getUint16(offset + 2);
      if (length < 2) {
        // Corrupt segment length; nothing meaningful to advance by
        break;
      }

      if (marker === 0xff_e1) {
        // APP1 Marker: only some APP1 segments carry Exif (others carry XMP)
        const exifHeaderOffset = offset + 4;
        if (
          fitsInView(view, exifHeaderOffset, 6) &&
          view.getUint32(exifHeaderOffset) === 0x45_78_69_66 &&
          view.getUint16(exifHeaderOffset + 4) === 0x00_00
        ) {
          return parseTiff(view, exifHeaderOffset + 6);
        }
      }

      offset += 2 + length;
    }
    return null;
  } catch {
    // Malformed/truncated input must never veto an otherwise valid file
    return null;
  }
};

export const parseJpegExif = async (file: File): Promise<ExifData | null> => {
  const buffer = await file.slice(0, EXIF_SCAN_BYTES).arrayBuffer();
  return parseExifFromBuffer(buffer);
};
