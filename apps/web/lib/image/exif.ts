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
      const subValPos =
        subCount <= 4 && subType !== 2
          ? subEntryOffset + 8
          : tiffOffset + subValueOffset;

      if (subTag === 0x82_9a) {
        // ExposureTime
        const num = view.getUint32(subValPos, isLittleEndian);
        const den = view.getUint32(subValPos + 4, isLittleEndian);
        if (den > 0) {
          exifData.exposureTime =
            num === 1 ? `1/${den}` : `${(num / den).toFixed(2)}s`;
        }
      } else if (subTag === 0x82_9d) {
        // FNumber
        const num = view.getUint32(subValPos, isLittleEndian);
        const den = view.getUint32(subValPos + 4, isLittleEndian);
        if (den > 0) {
          exifData.fNumber = `f/${(num / den).toFixed(1)}`;
        }
      } else if (subTag === 0x88_27) {
        // ISO
        exifData.iso = view.getUint16(subValPos, isLittleEndian);
      } else if (subTag === 0x92_0a) {
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

      const valPos =
        count <= 4 && type !== 2 ? entryOffset + 8 : tiffOffset + valueOffset;

      if (tag === 0x01_0f) {
        // Make
        exifData.make = readString(view, valPos, count);
      } else if (tag === 0x01_10) {
        // Model
        exifData.model = readString(view, valPos, count);
      } else if (tag === 0x01_32) {
        // DateTime
        exifData.dateTime = readString(view, valPos, count);
      } else if (tag === 0x01_05) {
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

export const parseJpegExif = async (file: File): Promise<ExifData | null> => {
  const buffer = await file.slice(0, 128 * 1024).arrayBuffer();
  const view = new DataView(buffer);

  if (view.byteLength < 4 || view.getUint16(0) !== 0xff_d8) {
    // Not JPEG
    return null;
  }

  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint16(offset) === 0xff_e1) {
      // APP1 Marker
      const exifHeaderOffset = offset + 4;
      if (
        view.getUint32(exifHeaderOffset) === 0x45_78_69_66 &&
        view.getUint16(exifHeaderOffset + 4) === 0x00_00
      ) {
        return parseTiff(view, exifHeaderOffset + 6);
      }
      break;
    }
    const length = view.getUint16(offset + 2);
    offset += 2 + length;
  }
  return null;
};
